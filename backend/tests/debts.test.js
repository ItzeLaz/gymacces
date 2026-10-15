import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { addDays, today } from '../src/utils/dates.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import { createMembership, createMembershipType, createPayment } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

describe('consulta de pagos y adeudos', () => {
  let adminToken;
  let recepToken;
  let trainerToken;
  let clienteUsuario;
  let clientToken;
  let deudor;
  let parcial;
  let liquidado;
  let hoy;

  before(async () => {
    await resetTestDatabase();
    adminToken = tokenFor(await createUser({ rol: 'administrador' }));
    recepToken = tokenFor(await createUser({ rol: 'recepcionista' }));
    trainerToken = tokenFor(await createUser({ rol: 'entrenador' }));
    const tipo = await createMembershipType({ nombre: 'Mensual' });
    hoy = today();
    const periodo = { id_tipo_membresia: tipo.id_tipo_membresia, fecha_inicio: hoy, fecha_fin: addDays(hoy, 29) };

    // Debe 450.00 completos más 100.00 de otra membresía
    deudor = await createClient({ nombre: 'Daniel', apellido: 'Deudor' });
    await createMembership({ ...periodo, id_cliente: deudor.id_cliente, monto: '450.00' });
    await createMembership({
      ...periodo,
      id_cliente: deudor.id_cliente,
      fecha_inicio: addDays(hoy, 30),
      fecha_fin: addDays(hoy, 59),
      monto: '100.00',
    });

    // Pagó 200.00 en efectivo y 50.00 anulados: debe 250.00
    parcial = await createClient({ nombre: 'Paula', apellido: 'Parcial' });
    const mParcial = await createMembership({ ...periodo, id_cliente: parcial.id_cliente, monto: '450.00' });
    await createPayment({ id_cliente: parcial.id_cliente, id_membresia: mParcial.id_membresia, monto: '200.00', metodo_pago: 'efectivo' });
    await createPayment({
      id_cliente: parcial.id_cliente,
      id_membresia: mParcial.id_membresia,
      monto: '50.00',
      metodo_pago: 'tarjeta',
      estado: 'cancelado',
    });

    // Pagó todo: no debe nada; además tiene una cancelada sin pagar que no cuenta
    liquidado = await createClient({ nombre: 'Luis', apellido: 'Liquidado' });
    const mLiquidada = await createMembership({ ...periodo, id_cliente: liquidado.id_cliente, monto: '450.00' });
    await createPayment({
      id_cliente: liquidado.id_cliente,
      id_membresia: mLiquidada.id_membresia,
      monto: '450.00',
      metodo_pago: 'transferencia',
    });
    await createMembership({
      ...periodo,
      id_cliente: liquidado.id_cliente,
      fecha_inicio: addDays(hoy, 30),
      fecha_fin: addDays(hoy, 59),
      estado: 'cancelada',
    });

    const resultado = await createClientUser({ nombre: 'Carla', apellido: 'Cliente' });
    clienteUsuario = resultado.cliente;
    clientToken = tokenFor(resultado.usuario);
    const mPropia = await createMembership({ ...periodo, id_cliente: clienteUsuario.id_cliente, monto: '300.00' });
    await createPayment({ id_cliente: clienteUsuario.id_cliente, id_membresia: mPropia.id_membresia, monto: '100.00' });
  });

  after(closePool);

  const get = (url, token = adminToken) => request(app).get(url).set(bearer(token));

  it('historial_general_filtra_y_suma_lo_pagado', async () => {
    const todos = await get('/api/payments?limit=100');
    assert.equal(todos.status, 200);
    assert.equal(todos.body.meta.total, 4);
    assert.equal(todos.body.meta.total_pagado, '750.00', 'los pagos anulados no suman');
    assert.ok(todos.body.data[0].cliente.nombre, 'cada pago trae el nombre del cliente');

    const porCliente = await get(`/api/payments?id_cliente=${parcial.id_cliente}`);
    assert.equal(porCliente.body.meta.total, 2);
    assert.equal(porCliente.body.meta.total_pagado, '200.00');

    const porMetodo = await get('/api/payments?metodo_pago=transferencia');
    assert.equal(porMetodo.body.meta.total, 1);

    const anulados = await get('/api/payments?estado=cancelado');
    assert.equal(anulados.body.meta.total, 1);

    const hoyResp = await get(`/api/payments?desde=${hoy}&hasta=${hoy}`);
    assert.equal(hoyResp.body.meta.total, 4, 'los pagos de hoy entran en el rango del día');
    const manana = await get(`/api/payments?desde=${addDays(hoy, 1)}&hasta=${addDays(hoy, 1)}`);
    assert.equal(manana.body.meta.total, 0);
  });

  it('valida_el_rango_de_fechas', async () => {
    assert.equal((await get(`/api/payments?desde=${hoy}&hasta=${addDays(hoy, -1)}`)).status, 400);
    assert.equal((await get(`/api/payments?desde=${addDays(hoy, -400)}&hasta=${hoy}`)).status, 400);
    assert.equal((await get('/api/payments?desde=2026-13-01')).status, 400);
  });

  it('lista_solo_clientes_con_adeudo_ordenados_de_mayor_a_menor', async () => {
    const response = await get('/api/debts');
    assert.equal(response.status, 200);
    const nombres = response.body.data.map((fila) => fila.apellido);
    assert.deepEqual(nombres, ['Deudor', 'Parcial', 'Cliente']);
    assert.equal(response.body.data[0].adeudo, '550.00');
    assert.equal(response.body.data[0].membresias.length, 2);
    assert.equal(response.body.data[1].adeudo, '250.00');
    assert.equal(response.body.meta.total_adeudo, '1000.00');
    assert.equal(response.body.meta.total, 3);

    const busqueda = await get('/api/debts?search=Parcial');
    assert.equal(busqueda.body.data.length, 1);
  });

  it('solo_el_administrador_consulta_el_historial_general_y_los_adeudos', async () => {
    for (const token of [recepToken, trainerToken, clientToken]) {
      assert.equal((await get('/api/payments', token)).status, 403);
      assert.equal((await get('/api/debts', token)).status, 403);
    }
  });

  it('el_cliente_ve_sus_pagos_y_su_adeudo_y_nunca_los_de_otro', async () => {
    const response = await get('/api/clients/me', clientToken);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.adeudo, '200.00');
    assert.equal(response.body.data.pagos.length, 1);
    assert.ok(response.body.data.pagos.every((pago) => pago.id_cliente === clienteUsuario.id_cliente));
  });
});
