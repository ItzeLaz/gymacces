import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { addDays, today } from '../src/utils/dates.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import { createMembership, createMembershipType } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

const MONEY_FIELDS = ['monto', 'pagado', 'saldo', 'estado_pago'];

describe('asignación y estados de membresías', () => {
  let adminToken;
  let recepToken;
  let trainerToken;
  let mensual;
  let hoy;

  before(async () => {
    await resetTestDatabase();
    adminToken = tokenFor(await createUser({ rol: 'administrador' }));
    recepToken = tokenFor(await createUser({ rol: 'recepcionista' }));
    trainerToken = tokenFor(await createUser({ rol: 'entrenador' }));
    mensual = await createMembershipType({ nombre: 'Mensual', duracion_dias: 30, precio: '450.00' });
    hoy = today();
  });

  after(closePool);

  const assign = (idCliente, body, token = recepToken) =>
    request(app).post(`/api/clients/${idCliente}/memberships`).set(bearer(token)).send(body);

  const changeStatus = (idMembresia, body, token = adminToken) =>
    request(app).patch(`/api/memberships/${idMembresia}/status`).set(bearer(token)).send(body);

  it('recepcionista_asigna_membresia_con_fin_calculado_y_monto_del_tipo', async () => {
    const cliente = await createClient();
    const response = await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia });

    assert.equal(response.status, 201, 'la asignación válida debe responder 201');
    const membresia = response.body.data;
    assert.equal(membresia.fecha_inicio, hoy, 'por omisión inicia hoy');
    assert.equal(membresia.fecha_fin, addDays(hoy, 29), 'el fin es inicio + duración - 1');
    assert.equal(membresia.monto, '450.00');
    assert.equal(membresia.saldo, '450.00');
    assert.equal(membresia.estado_pago, 'pendiente');
    assert.equal(membresia.estado_efectivo, 'activa');
    assert.equal(membresia.vigente, true);
    assert.equal(membresia.tipo.nombre, 'Mensual');

    const [audit] = await pool.execute(
      "SELECT accion FROM auditoria WHERE entidad = 'membresias' AND id_registro = ?",
      [membresia.id_membresia],
    );
    assert.deepEqual(audit.map((row) => row.accion), ['membresia.asignar']);
  });

  it('rechaza_asignacion_que_se_traslapa_e_indica_usar_la_renovacion', async () => {
    const cliente = await createClient();
    await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia });
    const response = await assign(cliente.id_cliente, {
      id_tipo_membresia: mensual.id_tipo_membresia,
      fecha_inicio: addDays(hoy, 10),
    });
    assert.equal(response.status, 422);
    assert.equal(response.body.error.code, 'BUSINESS_RULE');
    assert.equal(response.body.error.message, 'El cliente ya tiene una membresía en ese periodo. Usa la renovación.');
  });

  it('rechaza_cliente_inactivo_tipo_inactivo_y_fecha_pasada', async () => {
    const inactivo = await createClient({ estado: 'inactivo' });
    const r1 = await assign(inactivo.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia });
    assert.equal(r1.status, 422, 'un cliente inactivo no recibe membresías');

    const cliente = await createClient();
    const tipoInactivo = await createMembershipType({ estado: 'inactivo' });
    const r2 = await assign(cliente.id_cliente, { id_tipo_membresia: tipoInactivo.id_tipo_membresia });
    assert.equal(r2.status, 422, 'un tipo inactivo no se puede asignar');

    const r3 = await assign(cliente.id_cliente, {
      id_tipo_membresia: mensual.id_tipo_membresia,
      fecha_inicio: addDays(hoy, -1),
    });
    assert.equal(r3.status, 422, 'la fecha de inicio no puede ser anterior a hoy');
  });

  it('responde_404_para_cliente_o_tipo_inexistente_y_400_para_fecha_invalida', async () => {
    const r1 = await assign(99999, { id_tipo_membresia: mensual.id_tipo_membresia });
    assert.equal(r1.status, 404);
    const cliente = await createClient();
    const r2 = await assign(cliente.id_cliente, { id_tipo_membresia: 99999 });
    assert.equal(r2.status, 404);
    const r3 = await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia, fecha_inicio: '2026-02-30' });
    assert.equal(r3.status, 400);
  });

  it('calcula_el_estado_efectivo_segun_la_fecha', async () => {
    const cliente = await createClient();
    const base = { id_cliente: cliente.id_cliente, id_tipo_membresia: mensual.id_tipo_membresia };
    const vencidaAyer = await createMembership({ ...base, fecha_inicio: addDays(hoy, -40), fecha_fin: addDays(hoy, -1) });
    const suspendidaPasada = await createMembership({
      ...base,
      fecha_inicio: addDays(hoy, -80),
      fecha_fin: addDays(hoy, -50),
      estado: 'suspendida',
    });

    const otro = await createClient();
    const terminaHoy = await createMembership({
      id_cliente: otro.id_cliente,
      id_tipo_membresia: mensual.id_tipo_membresia,
      fecha_inicio: addDays(hoy, -29),
      fecha_fin: hoy,
    });
    const futura = await createMembership({
      id_cliente: otro.id_cliente,
      id_tipo_membresia: mensual.id_tipo_membresia,
      fecha_inicio: addDays(hoy, 1),
      fecha_fin: addDays(hoy, 30),
    });

    const lista = async (idCliente) =>
      (await request(app).get(`/api/clients/${idCliente}/memberships`).set(bearer(recepToken))).body.data;
    const porId = (data, id) => data.historial.find((m) => m.id_membresia === id);

    const primero = await lista(cliente.id_cliente);
    assert.equal(porId(primero, vencidaAyer.id_membresia).estado_efectivo, 'vencida', 'fin ayer = vencida');
    assert.equal(porId(primero, vencidaAyer.id_membresia).vigente, false);
    assert.equal(porId(primero, suspendidaPasada.id_membresia).estado_efectivo, 'vencida', 'suspendida con fin pasado = vencida');

    const segundo = await lista(otro.id_cliente);
    assert.equal(porId(segundo, terminaHoy.id_membresia).vigente, true, 'el día de fin sigue vigente');
    assert.equal(porId(segundo, futura.id_membresia).por_iniciar, true);
    assert.equal(porId(segundo, futura.id_membresia).vigente, false, 'una membresía futura todavía no es vigente');
    assert.equal(segundo.actual.id_membresia, terminaHoy.id_membresia, 'la actual es la vigente');
    assert.equal(segundo.historial[0].id_membresia, futura.id_membresia, 'el historial va de la más reciente a la más antigua');
  });

  it('admin_suspende_reactiva_sin_cambiar_fechas_y_cancela_con_motivo', async () => {
    const cliente = await createClient();
    const asignada = (await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia })).body.data;

    const suspendida = await changeStatus(asignada.id_membresia, { estado: 'suspendida', motivo: 'Lesión' });
    assert.equal(suspendida.status, 200);
    assert.equal(suspendida.body.data.estado_efectivo, 'suspendida');
    assert.equal(suspendida.body.data.vigente, false);
    assert.equal(suspendida.body.data.motivo_estado, 'Lesión');

    const reactivada = await changeStatus(asignada.id_membresia, { estado: 'activa', motivo: 'Alta médica' });
    assert.equal(reactivada.body.data.estado_efectivo, 'activa');
    assert.equal(reactivada.body.data.fecha_fin, asignada.fecha_fin, 'reactivar no extiende las fechas');

    const cancelada = await changeStatus(asignada.id_membresia, { estado: 'cancelada', motivo: 'Baja voluntaria' });
    assert.equal(cancelada.body.data.estado_efectivo, 'cancelada');
    assert.equal(cancelada.body.data.saldo, '0.00', 'una membresía cancelada no genera adeudo');

    const [audit] = await pool.execute(
      "SELECT accion FROM auditoria WHERE entidad = 'membresias' AND id_registro = ? ORDER BY id_auditoria",
      [asignada.id_membresia],
    );
    assert.deepEqual(audit.map((row) => row.accion), [
      'membresia.asignar',
      'membresia.suspender',
      'membresia.reactivar',
      'membresia.cancelar',
    ]);
  });

  it('rechaza_transiciones_no_permitidas_y_exige_motivo', async () => {
    const cliente = await createClient();
    const asignada = (await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia })).body.data;

    const sinMotivo = await changeStatus(asignada.id_membresia, { estado: 'suspendida' });
    assert.equal(sinMotivo.status, 400, 'el motivo es obligatorio');

    const reactivarActiva = await changeStatus(asignada.id_membresia, { estado: 'activa', motivo: 'x' });
    assert.equal(reactivarActiva.status, 422, 'solo se reactiva una suspendida');

    await changeStatus(asignada.id_membresia, { estado: 'cancelada', motivo: 'Baja' });
    const reactivarCancelada = await changeStatus(asignada.id_membresia, { estado: 'activa', motivo: 'x' });
    assert.equal(reactivarCancelada.status, 422, 'una cancelada no se reactiva');

    const vencida = await createMembership({
      id_cliente: cliente.id_cliente,
      id_tipo_membresia: mensual.id_tipo_membresia,
      fecha_inicio: addDays(hoy, -60),
      fecha_fin: addDays(hoy, -31),
    });
    const suspenderVencida = await changeStatus(vencida.id_membresia, { estado: 'suspendida', motivo: 'x' });
    assert.equal(suspenderVencida.status, 422, 'una vencida no se suspende');
  });

  it('recepcionista_no_puede_cambiar_el_estado_de_una_membresia', async () => {
    const cliente = await createClient();
    const asignada = (await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia })).body.data;
    const response = await changeStatus(asignada.id_membresia, { estado: 'suspendida', motivo: 'x' }, recepToken);
    assert.equal(response.status, 403);
  });

  it('entrenador_consulta_membresias_sin_datos_financieros_y_no_puede_asignar', async () => {
    const cliente = await createClient();
    await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia });

    const response = await request(app).get(`/api/clients/${cliente.id_cliente}/memberships`).set(bearer(trainerToken));
    assert.equal(response.status, 200);
    for (const field of MONEY_FIELDS) {
      assert.equal(field in response.body.data.actual, false, `el entrenador no debe recibir ${field}`);
    }

    const asignar = await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia }, trainerToken);
    assert.equal(asignar.status, 403);
  });

  it('clientes_incluyen_membresia_actual_y_el_saldo_solo_para_el_personal_autorizado', async () => {
    const cliente = await createClient();
    await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia });

    const recep = await request(app).get(`/api/clients/${cliente.id_cliente}`).set(bearer(recepToken));
    assert.equal(recep.body.data.membresia_actual.estado_efectivo, 'activa');
    assert.equal(recep.body.data.membresia_actual.saldo, '450.00');

    const trainer = await request(app).get(`/api/clients/${cliente.id_cliente}`).set(bearer(trainerToken));
    assert.equal(trainer.body.data.membresia_actual.vigente, true);
    assert.equal('saldo' in trainer.body.data.membresia_actual, false, 'el entrenador no ve saldos');

    const lista = await request(app).get('/api/clients?limit=100').set(bearer(adminToken));
    const fila = lista.body.data.find((item) => item.id_cliente === cliente.id_cliente);
    assert.equal(fila.membresia_actual.fecha_fin, addDays(hoy, 29));

    const sinMembresia = await createClient();
    const vacio = await request(app).get(`/api/clients/${sinMembresia.id_cliente}`).set(bearer(recepToken));
    assert.equal(vacio.body.data.membresia_actual, null);
  });

  it('cliente_ve_su_propia_membresia_en_su_perfil', async () => {
    const { cliente, usuario } = await createClientUser();
    await assign(cliente.id_cliente, { id_tipo_membresia: mensual.id_tipo_membresia });
    const response = await request(app).get('/api/clients/me').set(bearer(tokenFor(usuario)));
    assert.equal(response.status, 200);
    assert.equal(response.body.data.membresia.id_cliente, cliente.id_cliente);
    assert.equal(response.body.data.membresia.estado_efectivo, 'activa');

    const ajena = await request(app).get(`/api/clients/${cliente.id_cliente}/memberships`).set(bearer(tokenFor(usuario)));
    assert.equal(ajena.status, 403, 'el cliente no usa los endpoints del personal');
  });
});
