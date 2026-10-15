import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { today, addDays } from '../src/utils/dates.js';
import { resetTestDatabase, createUser, createClient, closePool } from './helpers/db.js';
import { createMembership, createMembershipType } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

describe('registro y anulación de pagos', () => {
  let admin;
  let adminToken;
  let recep;
  let recepToken;
  let trainerToken;
  let tipo;

  before(async () => {
    await resetTestDatabase();
    admin = await createUser({ rol: 'administrador' });
    adminToken = tokenFor(admin);
    recep = await createUser({ rol: 'recepcionista', nombre: 'Ana' });
    recepToken = tokenFor(recep);
    trainerToken = tokenFor(await createUser({ rol: 'entrenador' }));
    tipo = await createMembershipType({ precio: '450.00' });
  });

  after(closePool);

  // Membresía vigente de 450.00 para un cliente nuevo
  async function nuevaMembresia(datos = {}) {
    const cliente = await createClient();
    const hoy = today();
    const membresia = await createMembership({
      id_cliente: cliente.id_cliente,
      id_tipo_membresia: tipo.id_tipo_membresia,
      fecha_inicio: hoy,
      fecha_fin: addDays(hoy, 29),
      monto: '450.00',
      ...datos,
    });
    return { cliente, membresia };
  }

  const pay = (body, token = recepToken) => request(app).post('/api/payments').set(bearer(token)).send(body);

  it('registra_un_abono_ligado_al_cliente_de_la_membresia_y_lo_audita', async () => {
    const { cliente, membresia } = await nuevaMembresia();
    const response = await pay({ id_membresia: membresia.id_membresia, monto: '200', metodo_pago: 'efectivo' });

    assert.equal(response.status, 201, 'el pago válido debe responder 201');
    const { pago, membresia: actualizada } = response.body.data;
    assert.equal(pago.id_cliente, cliente.id_cliente, 'el cliente se toma de la membresía');
    assert.equal(pago.monto, '200.00');
    assert.equal(pago.estado, 'pagado');
    assert.equal(pago.registrado_por.nombre, 'Ana');
    assert.ok(pago.fecha_pago, 'el servidor asigna la fecha del pago');
    assert.equal(actualizada.saldo, '250.00');
    assert.equal(actualizada.estado_pago, 'parcial');

    const [audit] = await pool.execute("SELECT accion FROM auditoria WHERE entidad = 'pagos' AND id_registro = ?", [
      pago.id_pago,
    ]);
    assert.deepEqual(audit.map((row) => row.accion), ['pago.registrar']);
  });

  it('un_pago_por_el_saldo_restante_liquida_la_membresia', async () => {
    const { membresia } = await nuevaMembresia();
    await pay({ id_membresia: membresia.id_membresia, monto: '200.00', metodo_pago: 'tarjeta' });
    const response = await pay({ id_membresia: membresia.id_membresia, monto: '250.00', metodo_pago: 'transferencia' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.membresia.saldo, '0.00');
    assert.equal(response.body.data.membresia.estado_pago, 'pagada');
  });

  it('rechaza_un_monto_mayor_al_saldo_indicando_el_saldo', async () => {
    const { membresia } = await nuevaMembresia();
    await pay({ id_membresia: membresia.id_membresia, monto: '200.00', metodo_pago: 'efectivo' });
    const response = await pay({ id_membresia: membresia.id_membresia, monto: '300.00', metodo_pago: 'efectivo' });
    assert.equal(response.status, 422);
    assert.equal(response.body.error.message, 'El monto supera el saldo pendiente de 250.00.');
  });

  it('rechaza_pagos_sobre_membresia_cancelada_o_liquidada', async () => {
    const { membresia: cancelada } = await nuevaMembresia({ estado: 'cancelada' });
    const r1 = await pay({ id_membresia: cancelada.id_membresia, monto: '10.00', metodo_pago: 'efectivo' });
    assert.equal(r1.status, 422, 'no se paga una membresía cancelada');

    const { membresia: gratis } = await nuevaMembresia({ monto: '0.00' });
    const r2 = await pay({ id_membresia: gratis.id_membresia, monto: '10.00', metodo_pago: 'efectivo' });
    assert.equal(r2.status, 422, 'no se paga una membresía sin saldo');
  });

  it('valida_monto_y_metodo_de_pago', async () => {
    const { membresia } = await nuevaMembresia();
    for (const body of [
      { monto: '0', metodo_pago: 'efectivo' },
      { monto: '-5', metodo_pago: 'efectivo' },
      { monto: '10.123', metodo_pago: 'efectivo' },
      { monto: '10.00', metodo_pago: 'cheque' },
    ]) {
      const response = await pay({ id_membresia: membresia.id_membresia, ...body });
      assert.equal(response.status, 400, `debe rechazar ${JSON.stringify(body)}`);
    }
    const inexistente = await pay({ id_membresia: 99999, monto: '10.00', metodo_pago: 'efectivo' });
    assert.equal(inexistente.status, 404);
  });

  it('dos_pagos_simultaneos_nunca_dejan_el_saldo_negativo', async () => {
    const { membresia } = await nuevaMembresia();
    const body = { id_membresia: membresia.id_membresia, monto: '300.00', metodo_pago: 'efectivo' };
    const [a, b] = await Promise.all([pay(body), pay(body, adminToken)]);
    const estados = [a.status, b.status].sort();
    assert.deepEqual(estados, [201, 422], 'solo uno de los dos pagos debe registrarse');

    const [rows] = await pool.execute("SELECT SUM(monto) AS total FROM pagos WHERE id_membresia = ? AND estado = 'pagado'", [
      membresia.id_membresia,
    ]);
    assert.equal(rows[0].total, '300.00');
  });

  it('admin_anula_un_pago_con_motivo_y_el_saldo_se_restaura', async () => {
    const { membresia } = await nuevaMembresia();
    const { pago } = (await pay({ id_membresia: membresia.id_membresia, monto: '450.00', metodo_pago: 'efectivo' })).body
      .data;

    const cancel = (token, body = { motivo: 'Capturado dos veces' }) =>
      request(app).patch(`/api/payments/${pago.id_pago}/cancel`).set(bearer(token)).send(body);

    assert.equal((await cancel(recepToken)).status, 403, 'el recepcionista no anula pagos');
    assert.equal((await cancel(adminToken, {})).status, 400, 'el motivo es obligatorio');

    const anulado = await cancel(adminToken);
    assert.equal(anulado.status, 200);
    assert.equal(anulado.body.data.estado, 'cancelado');
    assert.equal(anulado.body.data.motivo_anulacion, 'Capturado dos veces');
    assert.ok(anulado.body.data.anulado_en);

    assert.equal((await cancel(adminToken)).status, 422, 'no se anula dos veces');

    const cuenta = await request(app).get(`/api/clients/${membresia.id_cliente}/payments`).set(bearer(recepToken));
    assert.equal(cuenta.body.data.adeudo, '450.00', 'el pago anulado deja de contar');
    assert.equal(cuenta.body.data.pagos[0].estado, 'cancelado', 'el pago anulado sigue en el historial');

    const [audit] = await pool.execute(
      "SELECT accion FROM auditoria WHERE entidad = 'pagos' AND id_registro = ? ORDER BY id_auditoria",
      [pago.id_pago],
    );
    assert.deepEqual(audit.map((row) => row.accion), ['pago.registrar', 'pago.anular']);
  });

  it('no_existe_borrado_de_pagos', async () => {
    const { membresia } = await nuevaMembresia();
    const { pago } = (await pay({ id_membresia: membresia.id_membresia, monto: '10.00', metodo_pago: 'efectivo' })).body
      .data;
    const response = await request(app).delete(`/api/payments/${pago.id_pago}`).set(bearer(adminToken));
    assert.equal(response.status, 404);
  });

  it('pagos_de_un_cliente_para_admin_y_recepcionista_pero_no_para_el_entrenador', async () => {
    const { cliente, membresia } = await nuevaMembresia();
    await pay({ id_membresia: membresia.id_membresia, monto: '100.00', metodo_pago: 'efectivo' });

    const recepResp = await request(app).get(`/api/clients/${cliente.id_cliente}/payments`).set(bearer(recepToken));
    assert.equal(recepResp.status, 200);
    assert.equal(recepResp.body.data.pagos.length, 1);
    assert.equal(recepResp.body.data.adeudo, '350.00');
    assert.equal(recepResp.body.data.membresias[0].saldo, '350.00');

    const adminResp = await request(app).get(`/api/clients/${cliente.id_cliente}/payments`).set(bearer(adminToken));
    assert.equal(adminResp.status, 200);

    const trainerResp = await request(app).get(`/api/clients/${cliente.id_cliente}/payments`).set(bearer(trainerToken));
    assert.equal(trainerResp.status, 403);
    const trainerPay = await pay({ id_membresia: membresia.id_membresia, monto: '1.00', metodo_pago: 'efectivo' }, trainerToken);
    assert.equal(trainerPay.status, 403);
  });
});
