import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { addDays, today } from '../src/utils/dates.js';
import { resetTestDatabase, createUser, createClient, closePool } from './helpers/db.js';
import { createMembership, createMembershipType } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

describe('renovación de membresías', () => {
  let recepToken;
  let trainerToken;
  let mensual;
  let hoy;

  before(async () => {
    await resetTestDatabase();
    recepToken = tokenFor(await createUser({ rol: 'recepcionista' }));
    trainerToken = tokenFor(await createUser({ rol: 'entrenador' }));
    mensual = await createMembershipType({ nombre: 'Mensual', duracion_dias: 30, precio: '450.00' });
    hoy = today();
  });

  after(closePool);

  const renew = (idCliente, body = { id_tipo_membresia: mensual.id_tipo_membresia }, token = recepToken) =>
    request(app).post(`/api/clients/${idCliente}/memberships/renew`).set(bearer(token)).send(body);

  async function clienteCon(membresia) {
    const cliente = await createClient();
    await createMembership({ id_cliente: cliente.id_cliente, id_tipo_membresia: mensual.id_tipo_membresia, ...membresia });
    return cliente;
  }

  it('renovar_una_vigente_inicia_al_dia_siguiente_de_su_fin_y_se_audita', async () => {
    const fin = addDays(hoy, 10);
    const cliente = await clienteCon({ fecha_inicio: addDays(hoy, -19), fecha_fin: fin });
    const response = await renew(cliente.id_cliente);

    assert.equal(response.status, 201);
    assert.equal(response.body.data.fecha_inicio, addDays(fin, 1), 'no se pierden días');
    assert.equal(response.body.data.fecha_fin, addDays(fin, 30));
    assert.equal(response.body.data.por_iniciar, true);

    const [audit] = await pool.execute("SELECT accion FROM auditoria WHERE entidad = 'membresias' AND id_registro = ?", [
      response.body.data.id_membresia,
    ]);
    assert.deepEqual(audit.map((row) => row.accion), ['membresia.renovar']);
  });

  it('renovar_una_vencida_inicia_hoy_o_en_la_fecha_indicada_nunca_en_el_pasado', async () => {
    const cliente = await clienteCon({ fecha_inicio: addDays(hoy, -40), fecha_fin: addDays(hoy, -11) });
    const pasada = await renew(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia, fecha_inicio: addDays(hoy, -1) });
    assert.equal(pasada.status, 422, 'no se renueva con fecha pasada');

    const response = await renew(cliente.id_cliente);
    assert.equal(response.status, 201);
    assert.equal(response.body.data.fecha_inicio, hoy);
    assert.equal(response.body.data.vigente, true);

    const otro = await clienteCon({ fecha_inicio: addDays(hoy, -40), fecha_fin: addDays(hoy, -11) });
    const futura = await renew(otro.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia, fecha_inicio: addDays(hoy, 3) });
    assert.equal(futura.body.data.fecha_inicio, addDays(hoy, 3));
  });

  it('renovar_tras_una_cancelada_funciona_como_asignacion_nueva', async () => {
    const cliente = await clienteCon({ fecha_inicio: addDays(hoy, -5), fecha_fin: addDays(hoy, 24), estado: 'cancelada' });
    const response = await renew(cliente.id_cliente);
    assert.equal(response.status, 201);
    assert.equal(response.body.data.fecha_inicio, hoy, 'una cancelada no bloquea el periodo');
  });

  it('dos_renovaciones_se_encadenan_al_fin_de_la_ultima', async () => {
    const fin = addDays(hoy, 5);
    const cliente = await clienteCon({ fecha_inicio: addDays(hoy, -24), fecha_fin: fin });
    const primera = (await renew(cliente.id_cliente)).body.data;
    const segunda = (await renew(cliente.id_cliente)).body.data;
    assert.equal(primera.fecha_inicio, addDays(fin, 1));
    assert.equal(segunda.fecha_inicio, addDays(primera.fecha_fin, 1));

    const historial = await request(app).get(`/api/clients/${cliente.id_cliente}/memberships`).set(bearer(recepToken));
    assert.equal(historial.body.data.historial.length, 3, 'se conservan todas las membresías');
  });

  it('renovar_una_suspendida_con_fin_futuro_se_encadena_despues', async () => {
    const fin = addDays(hoy, 15);
    const cliente = await clienteCon({ fecha_inicio: addDays(hoy, -14), fecha_fin: fin, estado: 'suspendida' });
    const response = await renew(cliente.id_cliente);
    assert.equal(response.body.data.fecha_inicio, addDays(fin, 1));
  });

  it('rechaza_tipo_inactivo_y_al_entrenador', async () => {
    const cliente = await clienteCon({ fecha_inicio: addDays(hoy, -5), fecha_fin: addDays(hoy, 24) });
    const inactivo = await createMembershipType({ estado: 'inactivo' });
    assert.equal((await renew(cliente.id_cliente, { id_tipo_membresia: inactivo.id_tipo_membresia })).status, 422);
    assert.equal((await renew(cliente.id_cliente, undefined, trainerToken)).status, 403);
  });
});
