import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { addDays, today } from '../src/utils/dates.js';
import { resetTestDatabase, createUser, closePool } from './helpers/db.js';
import { createMembershipType } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

// Inserta filas en lotes de 1 000 para preparar el volumen de SC-001
async function bulkInsert(sql, rows) {
  for (let i = 0; i < rows.length; i += 1000) {
    await pool.query(sql, [rows.slice(i, i + 1000)]);
  }
}

describe('rendimiento del dashboard con volumen', () => {
  let adminToken;
  let hoy;

  before(async () => {
    await resetTestDatabase();
    const admin = await createUser({ rol: 'administrador' });
    adminToken = tokenFor(admin);
    hoy = today();
    const tipo = await createMembershipType();

    await bulkInsert(
      'INSERT INTO clientes (nombre, apellido, telefono, estado) VALUES ?',
      Array.from({ length: 1000 }, (_, i) => ['Cliente', `Volumen${i}`, '5512345678', i % 10 === 0 ? 'inactivo' : 'activo']),
    );
    const [clientes] = await pool.query('SELECT id_cliente FROM clientes ORDER BY id_cliente');
    const ids = clientes.map((fila) => fila.id_cliente);

    await bulkInsert(
      'INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, monto, estado) VALUES ?',
      ids.map((id, i) => {
        const inicio = addDays(hoy, -(i % 60));
        return [id, tipo.id_tipo_membresia, inicio, addDays(inicio, 29), '450.00', i % 25 === 0 ? 'cancelada' : 'activa'];
      }),
    );
    const [membresias] = await pool.query('SELECT id_membresia, id_cliente FROM membresias ORDER BY id_membresia');

    await bulkInsert(
      'INSERT INTO pagos (id_cliente, id_membresia, monto, metodo_pago, estado, fecha_pago) VALUES ?',
      Array.from({ length: 5000 }, (_, i) => {
        const membresia = membresias[i % membresias.length];
        return [membresia.id_cliente, membresia.id_membresia, '50.00', 'efectivo', i % 20 === 0 ? 'cancelado' : 'pagado', `${addDays(hoy, -(i % 300))} 09:00:00`];
      }),
    );

    await bulkInsert(
      'INSERT INTO accesos (id_cliente, resultado, motivo, registrado_por, fecha_hora) VALUES ?',
      Array.from({ length: 10000 }, (_, i) => {
        const rechazado = i % 4 === 0;
        return [
          rechazado ? null : ids[i % ids.length],
          rechazado ? 'rechazado' : 'autorizado',
          rechazado ? 'rostro_no_identificado' : null,
          admin.id_usuario,
          `${addDays(hoy, -(i % 300))} 08:00:00.000`,
        ];
      }),
    );
  });

  after(closePool);

  async function timed(query) {
    const inicio = Date.now();
    const response = await request(app).get(`/api/dashboard${query}`).set(bearer(adminToken));
    return { response, ms: Date.now() - inicio };
  }

  it('el_dashboard_del_mes_responde_en_menos_de_3_segundos', async () => {
    const { response, ms } = await timed('');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.clientes.activos + response.body.data.clientes.inactivos, 1000);
    assert.ok(ms < 3000, `tardó ${ms} ms (SC-001, SC-003)`);
  });

  it('un_rango_de_366_dias_responde_en_menos_de_3_segundos', async () => {
    const { response, ms } = await timed(`?periodo=rango&desde=${addDays(hoy, -366)}&hasta=${hoy}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.tendencia.length, 367);
    assert.equal(response.body.data.accesos.autorizados + response.body.data.accesos.rechazados, 10000);
    assert.ok(ms < 3000, `tardó ${ms} ms (SC-001, SC-003)`);
  });
});
