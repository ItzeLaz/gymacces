import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { addDays, today } from '../src/utils/dates.js';
import { resetTestDatabase, createUser, createClient, closePool } from './helpers/db.js';
import {
  createAccess,
  createMembership,
  createMembershipType,
  createPayment,
} from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

after(closePool);

describe('dashboard con la base vacía', () => {
  let adminToken;

  before(async () => {
    await resetTestDatabase();
    adminToken = tokenFor(await createUser({ rol: 'administrador' }));
  });

  it('base_vacia_devuelve_ceros_sin_errores', async () => {
    const response = await request(app).get('/api/dashboard').set(bearer(adminToken));
    assert.equal(response.status, 200);
    const data = response.body.data;
    assert.deepEqual(data.clientes, { activos: 0, inactivos: 0 });
    assert.deepEqual(data.membresias, { vigentes: 0, vencidas: 0, por_vencer: 0 });
    assert.deepEqual(data.pagos, { cantidad: 0, ingresos: '0.00' });
    assert.equal(data.adeudo_total, '0.00');
    assert.equal(data.accesos.autorizados, 0);
    assert.equal(data.accesos.rechazados, 0);
    assert.deepEqual(data.por_vencer, []);
    assert.deepEqual(data.rechazos_recientes, []);
  });
});

describe('dashboard: resumen general con datos conocidos', () => {
  let adminToken;
  let admin;
  let hoy;
  let data;
  const ids = {};

  before(async () => {
    await resetTestDatabase();
    admin = await createUser({ rol: 'administrador' });
    adminToken = tokenFor(admin);
    hoy = today();
    const inicioMes = `${hoy.slice(0, 8)}01`;
    const mesAnterior = `${addDays(inicioMes, -1)} 12:00:00`;
    const tipo = await createMembershipType({ nombre: 'Mensual' });

    const conMembresias = async (apellido, periodos) => {
      const cliente = await createClient({ nombre: 'Cliente', apellido });
      for (const [inicio, fin, estado = 'activa'] of periodos) {
        await createMembership({
          id_cliente: cliente.id_cliente,
          id_tipo_membresia: tipo.id_tipo_membresia,
          fecha_inicio: addDays(hoy, inicio),
          fecha_fin: addDays(hoy, fin),
          estado,
        });
      }
      return cliente;
    };

    await createClient({ apellido: 'Inactivo', estado: 'inactivo' });
    ids.vigente = await conMembresias('Vigente', [[-10, 20]]);
    ids.terminaHoy = await conMembresias('TerminaHoy', [[-29, 0]]);
    await conMembresias('Renovado', [[-26, 3], [4, 33]]);
    ids.vencido = await conMembresias('Vencido', [[-90, -61], [-60, -31]]);
    await conMembresias('Cancelado', [[-5, 24, 'cancelada']]);
    await conMembresias('Futuro', [[2, 31]]);
    ids.cinco = await conMembresias('CincoDias', [[-20, 5]]);
    ids.seis = await conMembresias('SeisDias', [[-20, 6]]);
    await conMembresias('SieteDias', [[-20, 7]]);

    // Pagos: dos válidos de hoy, uno anulado y uno del mes anterior (no cuentan los dos últimos)
    const pago = (cliente, monto, extra = {}) =>
      createPayment({ id_cliente: cliente.id_cliente, id_membresia: null, monto, ...extra });
    await pago(ids.vigente, '200.00');
    await pago(ids.terminaHoy, '150.50');
    await pago(ids.vigente, '99.00', { estado: 'cancelado' });
    await pago(ids.vigente, '500.00', { fecha_pago: mesAnterior });

    // Accesos del mes y anteriores
    const acceso = (datos) => createAccess({ registrado_por: admin.id_usuario, ...datos });
    for (let i = 0; i < 3; i += 1) await acceso({ id_cliente: ids.vigente.id_cliente, resultado: 'autorizado' });
    for (let i = 0; i < 9; i += 1) {
      await acceso({
        id_cliente: ids.vencido.id_cliente,
        resultado: 'rechazado',
        motivo: 'cliente_inactivo',
        fecha_hora: `${addDays(inicioMes, -40)} 08:00:00.000`,
      });
    }
    await acceso({ resultado: 'rechazado', motivo: 'sin_membresia_vigente', fecha_hora: `${mesAnterior}.000` });
    await acceso({ id_cliente: ids.vencido.id_cliente, resultado: 'rechazado', motivo: 'membresia_vencida' });
    await acceso({ id_cliente: ids.vencido.id_cliente, resultado: 'rechazado', motivo: 'membresia_vencida' });
    await acceso({ resultado: 'rechazado', motivo: 'rostro_no_identificado' });

    const response = await request(app).get('/api/dashboard').set(bearer(adminToken));
    assert.equal(response.status, 200);
    data = response.body.data;
  });

  it('por_omision_usa_el_mes_en_curso', () => {
    assert.equal(data.periodo.tipo, 'mes');
    assert.equal(data.periodo.desde, `${hoy.slice(0, 8)}01`);
    assert.equal(data.periodo.hasta, hoy);
    assert.ok(data.generado_en);
  });

  it('cuenta_clientes_activos_e_inactivos', () => {
    assert.deepEqual(data.clientes, { activos: 9, inactivos: 1 });
  });

  it('cuenta_clientes_por_estado_de_membresia_una_sola_vez', () => {
    // Vigentes: Vigente, TerminaHoy, Renovado, CincoDias, SeisDias, SieteDias
    // Vencidos: solo Vencido (dos membresías vencidas cuentan una vez); Cancelado y Futuro no cuentan
    // Por vencer: TerminaHoy, CincoDias y SeisDias; Renovado ya renovó y SieteDias queda fuera de la ventana
    assert.deepEqual(data.membresias, { vigentes: 6, vencidas: 1, por_vencer: 3 });
  });

  it('lista_las_membresias_por_vencer_ordenadas_por_fecha_de_fin', () => {
    assert.deepEqual(
      data.por_vencer.map((fila) => fila.apellido),
      ['TerminaHoy', 'CincoDias', 'SeisDias'],
    );
    assert.equal(data.por_vencer[0].fecha_fin, hoy);
    assert.equal(data.por_vencer[0].tipo, 'Mensual');
    assert.deepEqual(Object.keys(data.por_vencer[0]).sort(), ['apellido', 'fecha_fin', 'id_cliente', 'nombre', 'tipo']);
  });

  it('suma_pagos_e_ingresos_del_mes_sin_anulados_ni_meses_anteriores', () => {
    assert.deepEqual(data.pagos, { cantidad: 2, ingresos: '350.50' });
  });

  it('el_adeudo_total_coincide_con_la_consulta_de_adeudos', async () => {
    const deudas = await request(app).get('/api/debts').set(bearer(adminToken));
    assert.equal(data.adeudo_total, deudas.body.meta.total_adeudo);
  });

  it('cuenta_accesos_del_periodo_y_rechazos_por_motivo', () => {
    assert.equal(data.accesos.autorizados, 3);
    assert.equal(data.accesos.rechazados, 3);
    assert.deepEqual(data.accesos.rechazos_por_motivo, {
      rostro_no_identificado: 1,
      cliente_inactivo: 0,
      sin_membresia_vigente: 0,
      membresia_vencida: 2,
      membresia_suspendida: 0,
      membresia_cancelada: 0,
    });
  });

  it('lista_los_diez_rechazos_mas_recientes_sin_importar_el_periodo', () => {
    assert.equal(data.rechazos_recientes.length, 10);
    assert.equal(data.rechazos_recientes[0].motivo, 'rostro_no_identificado');
    assert.equal(data.rechazos_recientes[0].cliente, null);
    assert.deepEqual(data.rechazos_recientes[1].cliente, { nombre: 'Cliente', apellido: 'Vencido' });
    assert.equal(data.rechazos_recientes[3].motivo, 'sin_membresia_vigente', 'incluye rechazos de otros periodos');
  });
});
