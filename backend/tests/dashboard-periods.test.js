import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { addDays, today } from '../src/utils/dates.js';
import { resetTestDatabase, createUser, createClient, closePool } from './helpers/db.js';
import { createAccess, createPayment } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

describe('dashboard: periodos y tendencia diaria', () => {
  let adminToken;
  let hoy;

  before(async () => {
    await resetTestDatabase();
    const admin = await createUser({ rol: 'administrador' });
    adminToken = tokenFor(admin);
    hoy = today();
    const cliente = await createClient();

    // Pagos y accesos en días conocidos: hoy, hace 2 días y hace 10 días
    const pago = (dias, monto) =>
      createPayment({ id_cliente: cliente.id_cliente, id_membresia: null, monto, fecha_pago: `${addDays(hoy, -dias)} 10:00:00` });
    const acceso = (dias, resultado) =>
      createAccess({
        id_cliente: resultado === 'autorizado' ? cliente.id_cliente : null,
        resultado,
        motivo: resultado === 'rechazado' ? 'rostro_no_identificado' : null,
        registrado_por: admin.id_usuario,
        fecha_hora: `${addDays(hoy, -dias)} 10:00:00.000`,
      });
    await pago(0, '100.00');
    await pago(2, '50.25');
    await pago(10, '300.00');
    await acceso(0, 'autorizado');
    await acceso(0, 'rechazado');
    await acceso(2, 'autorizado');
    await acceso(10, 'rechazado');
  });

  after(closePool);

  const get = (query) => request(app).get(`/api/dashboard${query}`).set(bearer(adminToken));

  function assertTrendMatchesTotals(data) {
    const suma = data.tendencia.reduce(
      (total, dia) => ({
        ingresos: total.ingresos + Math.round(Number(dia.ingresos) * 100),
        autorizados: total.autorizados + dia.autorizados,
        rechazados: total.rechazados + dia.rechazados,
      }),
      { ingresos: 0, autorizados: 0, rechazados: 0 },
    );
    assert.equal(suma.ingresos, Math.round(Number(data.pagos.ingresos) * 100), 'la tendencia suma los ingresos');
    assert.equal(suma.autorizados, data.accesos.autorizados);
    assert.equal(suma.rechazados, data.accesos.rechazados);
  }

  it('periodo_hoy_solo_cuenta_el_dia_de_hoy', async () => {
    const { data } = (await get('?periodo=hoy')).body;
    assert.deepEqual(data.periodo, { tipo: 'hoy', desde: hoy, hasta: hoy });
    assert.deepEqual(data.pagos, { cantidad: 1, ingresos: '100.00' });
    assert.equal(data.accesos.autorizados, 1);
    assert.equal(data.accesos.rechazados, 1);
    assert.equal(data.tendencia.length, 1);
    assertTrendMatchesTotals(data);
  });

  it('ultimos_7_dias_tiene_7_entradas_con_ceros_en_los_dias_sin_datos', async () => {
    const { data } = (await get('?periodo=7d')).body;
    assert.deepEqual(data.periodo, { tipo: '7d', desde: addDays(hoy, -6), hasta: hoy });
    assert.equal(data.tendencia.length, 7);
    assert.deepEqual(
      data.tendencia.map((dia) => dia.fecha),
      Array.from({ length: 7 }, (_, i) => addDays(hoy, i - 6)),
      'una entrada por día en orden ascendente',
    );
    assert.deepEqual(data.tendencia[0], { fecha: addDays(hoy, -6), ingresos: '0.00', autorizados: 0, rechazados: 0 });
    assert.equal(data.pagos.ingresos, '150.25');
    assertTrendMatchesTotals(data);
  });

  it('rango_personalizado_incluye_ambos_extremos', async () => {
    const desde = addDays(hoy, -10);
    const { data } = (await get(`?periodo=rango&desde=${desde}&hasta=${hoy}`)).body;
    assert.deepEqual(data.periodo, { tipo: 'rango', desde, hasta: hoy });
    assert.equal(data.tendencia.length, 11);
    assert.equal(data.pagos.cantidad, 3);
    assert.equal(data.accesos.rechazados, 2);
    assertTrendMatchesTotals(data);
  });

  it('los_indicadores_sin_periodo_no_cambian_al_cambiar_el_periodo', async () => {
    const hoyResp = (await get('?periodo=hoy')).body.data;
    const rango = (await get(`?periodo=rango&desde=${addDays(hoy, -30)}&hasta=${hoy}`)).body.data;
    for (const campo of ['clientes', 'membresias', 'adeudo_total', 'rechazos_recientes', 'por_vencer']) {
      assert.deepEqual(hoyResp[campo], rango[campo], `${campo} no depende del periodo`);
    }
  });

  it('rechaza_periodos_y_rangos_invalidos', async () => {
    const casos = [
      '?periodo=semana',
      '?periodo=rango',
      `?periodo=rango&desde=${hoy}`,
      `?periodo=rango&desde=${hoy}&hasta=${addDays(hoy, -1)}`,
      `?periodo=rango&desde=${addDays(hoy, -367)}&hasta=${hoy}`,
      '?periodo=rango&desde=2026-02-30&hasta=2026-03-01',
    ];
    for (const query of casos) {
      const response = await get(query);
      assert.equal(response.status, 400, `debe rechazar ${query}`);
      assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    }
  });
});
