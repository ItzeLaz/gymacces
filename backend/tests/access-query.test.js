import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { addDays, today } from '../src/utils/dates.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import { tokenFor, bearer } from './helpers/auth.js';

describe('consulta de accesos', () => {
  let recep;
  let adminToken;
  let recepToken;
  let trainerToken;
  let clientToken;
  let propio;
  let otro;
  let hoy;

  async function insertAccess({ id_cliente = null, resultado, motivo = null, fecha_hora = null, similitud = '0.8000' }) {
    const [result] = await pool.execute(
      `INSERT INTO accesos (id_cliente, resultado, motivo, similitud, registrado_por, fecha_hora)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, NOW(3)))`,
      [id_cliente, resultado, motivo, similitud, recep.id_usuario, fecha_hora],
    );
    return result.insertId;
  }

  before(async () => {
    await resetTestDatabase();
    recep = await createUser({ rol: 'recepcionista', nombre: 'Ana' });
    adminToken = tokenFor(await createUser({ rol: 'administrador' }));
    recepToken = tokenFor(recep);
    trainerToken = tokenFor(await createUser({ rol: 'entrenador' }));
    const resultado = await createClientUser({ nombre: 'Carla', apellido: 'Cliente' });
    propio = resultado.cliente;
    clientToken = tokenFor(resultado.usuario);
    otro = await createClient({ nombre: 'Otro', apellido: 'Cliente' });
    hoy = today();

    await insertAccess({ id_cliente: propio.id_cliente, resultado: 'autorizado' });
    await insertAccess({ id_cliente: propio.id_cliente, resultado: 'rechazado', motivo: 'membresia_vencida' });
    await insertAccess({ id_cliente: otro.id_cliente, resultado: 'autorizado' });
    await insertAccess({ resultado: 'rechazado', motivo: 'rostro_no_identificado', similitud: '0.3100' });
    await insertAccess({
      id_cliente: otro.id_cliente,
      resultado: 'autorizado',
      fecha_hora: `${addDays(hoy, -3)} 10:00:00.000`,
    });
  });

  after(closePool);

  const get = (url, token = recepToken) => request(app).get(url).set(bearer(token));

  it('sin_filtros_devuelve_solo_los_accesos_de_hoy', async () => {
    const response = await get('/api/access');
    assert.equal(response.status, 200);
    assert.equal(response.body.meta.total, 4, 'el acceso de hace 3 días no aparece por omisión');

    const rango = await get(`/api/access?desde=${addDays(hoy, -5)}&hasta=${hoy}`);
    assert.equal(rango.body.meta.total, 5);
  });

  it('filtra_por_cliente_resultado_y_motivo', async () => {
    const porCliente = await get(`/api/access?id_cliente=${propio.id_cliente}`);
    assert.equal(porCliente.body.meta.total, 2);

    const rechazados = await get('/api/access?resultado=rechazado');
    assert.equal(rechazados.body.meta.total, 2);
    assert.ok(rechazados.body.data.every((fila) => fila.motivo));

    const porMotivo = await get('/api/access?motivo=membresia_vencida');
    assert.equal(porMotivo.body.meta.total, 1);

    assert.equal((await get('/api/access?motivo=otro')).status, 400);
  });

  it('el_rostro_no_identificado_llega_sin_cliente', async () => {
    const response = await get('/api/access?motivo=rostro_no_identificado');
    assert.equal(response.body.data[0].cliente, null);
    assert.equal(response.body.data[0].registrado_por.nombre, 'Ana');
  });

  it('solo_el_administrador_recibe_la_similitud', async () => {
    const admin = await get('/api/access', adminToken);
    assert.ok(admin.body.data.every((fila) => 'similitud' in fila));

    for (const token of [recepToken, trainerToken]) {
      const response = await get('/api/access', token);
      assert.equal(response.status, 200);
      assert.ok(response.body.data.every((fila) => !('similitud' in fila)), 'la similitud es solo para calibrar');
    }
  });

  it('el_cliente_solo_ve_sus_propios_accesos', async () => {
    assert.equal((await get('/api/access', clientToken)).status, 403);

    const response = await get('/api/clients/me/access', clientToken);
    assert.equal(response.status, 200);
    assert.equal(response.body.meta.total, 2);
    for (const fila of response.body.data) {
      assert.equal('similitud' in fila, false);
      assert.equal('registrado_por' in fila, false);
    }

    const ajeno = await get(`/api/clients/me/access?id_cliente=${otro.id_cliente}`, clientToken);
    assert.equal(ajeno.body.meta.total, 2, 'el cliente se toma siempre del token');
  });

  it('no_existen_rutas_para_modificar_o_borrar_accesos', async () => {
    const [[fila]] = await pool.execute('SELECT id_acceso FROM accesos LIMIT 1');
    const patch = await request(app).patch(`/api/access/${fila.id_acceso}`).set(bearer(adminToken)).send({});
    const del = await request(app).delete(`/api/access/${fila.id_acceso}`).set(bearer(adminToken));
    assert.equal(patch.status, 404);
    assert.equal(del.status, 404);
  });

  it('filtra_los_rechazados_del_dia_rapido_con_diez_mil_registros', async () => {
    const filas = [];
    for (let i = 0; i < 10000; i += 1) {
      const dia = addDays(hoy, -(i % 300));
      const rechazado = i % 3 === 0;
      filas.push([
        rechazado ? null : otro.id_cliente,
        rechazado ? 'rechazado' : 'autorizado',
        rechazado ? 'rostro_no_identificado' : null,
        recep.id_usuario,
        `${dia} 08:00:00.000`,
      ]);
    }
    for (let i = 0; i < filas.length; i += 1000) {
      const lote = filas.slice(i, i + 1000);
      await pool.query(
        'INSERT INTO accesos (id_cliente, resultado, motivo, registrado_por, fecha_hora) VALUES ?',
        [lote],
      );
    }

    const inicio = Date.now();
    const response = await get(`/api/access?resultado=rechazado&desde=${hoy}&hasta=${hoy}`);
    const duracion = Date.now() - inicio;
    assert.equal(response.status, 200);
    assert.ok(response.body.meta.total > 0);
    assert.ok(duracion < 1000, `la consulta tardó ${duracion} ms (SC-010)`);
  });
});
