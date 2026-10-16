import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { resetTestDatabase, createUser, createClient, closePool } from './helpers/db.js';
import { createClass, createMembership, createMembershipType, createReservation, createTrainer } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

// Reloj fijo: lunes 2026-10-19 a las 08:00 en America/Mexico_City (14:00 UTC). Ventana: 19 al 26.
const AHORA = Date.parse('2026-10-19T14:00:00Z');
const HOY = '2026-10-19';
const MARTES = '2026-10-20';
const HOY_MAS_7 = '2026-10-26';

// Historia 4: consultar reservados y lugares disponibles (spec.md, criterios US4-1 a US4-5)
describe('sesiones: horario y lista de reservados', () => {
  let admin;
  let adminToken;
  let recepToken;
  let spinning;
  let yoga;
  let funcional;
  let inactiva;

  before(async () => {
    mock.timers.enable({ apis: ['Date'], now: AHORA });
    await resetTestDatabase();
    admin = await createUser({ rol: 'administrador' });
    adminToken = tokenFor(admin);
    recepToken = tokenFor(await createUser({ rol: 'recepcionista' }));
    const carla = await createTrainer({ nombre: 'Carla Ruiz' });
    const beto = await createTrainer({ nombre: 'Beto Díaz' });

    // Martes 18:00, cupo 20: 3 reservas activas y 1 cancelada
    spinning = await createClass({ id_instructor: carla.id_usuario, nombre: 'Spinning', dia_semana: 2, hora_inicio: '18:00', cupo_maximo: 20 });
    // Lunes 07:00 (hoy ya terminó y el próximo lunes también entra en la ventana)
    yoga = await createClass({ id_instructor: beto.id_usuario, nombre: 'Yoga', dia_semana: 1, hora_inicio: '07:00', duracion_minutos: 45, cupo_maximo: 10 });
    // Martes 07:00, cupo 1 y lleno
    funcional = await createClass({ id_instructor: beto.id_usuario, nombre: 'Funcional', dia_semana: 2, hora_inicio: '07:00', cupo_maximo: 1 });
    inactiva = await createClass({ id_instructor: carla.id_usuario, nombre: 'Pilates', dia_semana: 3, hora_inicio: '09:00', estado: 'inactiva' });

    const reservar = async (idClase, fecha, datosCliente, extra = {}) => {
      const cliente = await createClient(datosCliente);
      return createReservation({ id_clase: idClase, fecha_sesion: fecha, id_cliente: cliente.id_cliente, registrado_por: admin.id_usuario, ...extra });
    };
    await reservar(spinning.id_clase, MARTES, { nombre: 'Zoe', apellido: 'Méndez' });
    await reservar(spinning.id_clase, MARTES, { nombre: 'Ana', apellido: 'Álvarez' }, { asistencia: 'presente' });
    await reservar(spinning.id_clase, MARTES, { nombre: 'Luis', apellido: 'Méndez' });
    await reservar(spinning.id_clase, MARTES, { nombre: 'Cancelado', apellido: 'Aguilar' }, { estado: 'cancelada' });
    await reservar(funcional.id_clase, MARTES, { nombre: 'Único', apellido: 'Lugar' });
  });

  after(async () => {
    mock.timers.reset();
    await closePool();
  });

  const horario = (query = '', token = recepToken) =>
    request(app).get(`/api/classes/schedule${query}`).set(bearer(token));
  const detalle = (idClase, fecha, token = recepToken) =>
    request(app).get(`/api/classes/${idClase}/sessions/${fecha}`).set(bearer(token));

  it('el_horario_muestra_las_sesiones_de_la_ventana_con_sus_lugares', async () => {
    const response = await horario();
    assert.equal(response.status, 200);
    const sesiones = response.body.data.map((sesion) => `${sesion.fecha_sesion} ${sesion.hora_inicio} ${sesion.nombre}`);
    assert.deepEqual(sesiones, [
      `${HOY} 07:00 Yoga`,
      `${MARTES} 07:00 Funcional`,
      `${MARTES} 18:00 Spinning`,
      `${HOY_MAS_7} 07:00 Yoga`,
    ], 'sesiones de hoy a hoy + 7, ordenadas por fecha y hora, sin la clase inactiva (US1-12)');

    const sesionSpinning = response.body.data.find((sesion) => sesion.id_clase === spinning.id_clase);
    assert.equal(sesionSpinning.lugares_disponibles, 17);
    assert.equal(sesionSpinning.reservas_activas, 3);
    assert.equal(sesionSpinning.estado_sesion, 'pendiente');
    assert.equal(response.body.data[0].estado_sesion, 'terminada', 'el yoga de hoy a las 07:00 ya terminó');
    assert.ok(!response.body.data.some((sesion) => sesion.id_clase === inactiva.id_clase));

    const desdeMiercoles = await horario('?desde=2026-10-21');
    assert.deepEqual(desdeMiercoles.body.data.map((sesion) => sesion.fecha_sesion), [HOY_MAS_7]);

    for (const desde of ['2026-10-18', '2026-10-27', '2026-02-30']) {
      const invalido = await horario(`?desde=${desde}`);
      assert.equal(invalido.status, 400, `desde=${desde} debe rechazarse`);
    }
  });

  it('el_detalle_de_sesion_muestra_datos_y_quedan_x_de_y_lugares', async () => {
    const response = await detalle(spinning.id_clase, MARTES);
    assert.equal(response.status, 200);
    const { sesion, texto_lugares: textoLugares } = response.body.data;
    assert.equal(sesion.nombre, 'Spinning');
    assert.equal(sesion.instructor.nombre, 'Carla Ruiz');
    assert.equal(sesion.fecha_sesion, MARTES);
    assert.equal(sesion.hora_inicio, '18:00');
    assert.equal(sesion.hora_fin, '18:45');
    assert.equal(sesion.cupo_maximo, 20);
    assert.equal(sesion.reservas_activas, 3);
    assert.equal(textoLugares, 'Quedan 17 de 20 lugares');
  });

  it('la_lista_de_reservados_esta_ordenada_por_apellido_y_nombre_con_su_asistencia', async () => {
    const response = await detalle(spinning.id_clase, MARTES, adminToken);
    const lista = response.body.data.reservas.map((reserva) => [
      `${reserva.cliente.apellido}, ${reserva.cliente.nombre}`,
      reserva.asistencia_mostrada,
    ]);
    assert.deepEqual(lista, [
      ['Álvarez, Ana', 'Presente'],
      ['Méndez, Luis', 'Sin registrar'],
      ['Méndez, Zoe', 'Sin registrar'],
    ]);
  });

  it('las_reservas_canceladas_no_cuentan_ni_aparecen', async () => {
    const response = await detalle(spinning.id_clase, MARTES);
    assert.equal(response.body.data.reservas.length, 3);
    assert.ok(response.body.data.reservas.every((reserva) => reserva.estado === 'activa'));
    assert.ok(!response.body.data.reservas.some((reserva) => reserva.cliente.apellido === 'Aguilar'));
    assert.equal(response.body.data.sesion.lugares_disponibles, 17);
  });

  it('una_sesion_sin_lugares_aparece_llena_en_el_horario', async () => {
    const response = await horario();
    const llena = response.body.data.find((sesion) => sesion.id_clase === funcional.id_clase);
    assert.equal(llena.llena, true);
    assert.equal(llena.lugares_disponibles, 0);
    const conLugar = response.body.data.find((sesion) => sesion.id_clase === spinning.id_clase);
    assert.equal(conLugar.llena, false);
  });

  it('el_detalle_rechaza_fecha_que_no_corresponde_a_la_clase', async () => {
    const inexistente = await detalle(999999, MARTES);
    assert.equal(inexistente.status, 404);
    assert.equal(inexistente.body.error.message, 'La clase no existe.');

    const otroDia = await detalle(spinning.id_clase, HOY);
    assert.equal(otroDia.status, 400, 'el lunes no corresponde a una clase de martes');
    assert.ok(otroDia.body.error.details.some((item) => item.field === 'fecha'));

    const invalida = await detalle(spinning.id_clase, '2026-13-01');
    assert.equal(invalida.status, 400);
  });

  it('el_detalle_de_una_sesion_pasada_sigue_disponible', async () => {
    const response = await detalle(yoga.id_clase, '2026-10-12');
    assert.equal(response.status, 200, 'se pueden consultar fechas pasadas para revisar la asistencia');
    assert.equal(response.body.data.sesion.estado_sesion, 'terminada');
    assert.equal(response.body.data.texto_lugares, 'Quedan 10 de 10 lugares');
  });

  // T101: ninguna respuesta de reservas expone contacto, datos faciales ni montos (principio III)
  it('el_detalle_no_expone_datos_de_contacto', async () => {
    const PROHIBIDOS = ['correo', 'telefono', 'direccion', 'descriptor', 'similitud', 'monto', 'saldo', 'password'];
    const buscarProhibidos = (valor, ruta = '') => {
      if (valor === null || typeof valor !== 'object') return [];
      return Object.entries(valor).flatMap(([clave, hijo]) => [
        ...(PROHIBIDOS.some((prohibido) => clave.toLowerCase().includes(prohibido)) ? [`${ruta}${clave}`] : []),
        ...buscarProhibidos(hijo, `${ruta}${clave}.`),
      ]);
    };

    const detalleSesion = await detalle(spinning.id_clase, MARTES, adminToken);
    assert.equal(detalleSesion.status, 200);
    assert.deepEqual(buscarProhibidos(detalleSesion.body), [], 'el detalle de sesión no debe exponer datos sensibles');

    const tipo = await createMembershipType();
    const cliente = await createClient({ correo: 'contacto.privado@prueba.com', telefono: '5599887766' });
    await createMembership({
      id_cliente: cliente.id_cliente,
      id_tipo_membresia: tipo.id_tipo_membresia,
      fecha_inicio: '2026-10-01',
      fecha_fin: '2026-11-30',
    });
    const reserva = await request(app)
      .post('/api/reservations')
      .set(bearer(recepToken))
      .send({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
    assert.equal(reserva.status, 201);
    assert.deepEqual(buscarProhibidos(reserva.body), [], 'la reserva creada no debe exponer datos sensibles');
    assert.ok(!JSON.stringify(reserva.body).includes('contacto.privado'), 'el correo no aparece en ningún valor');
    assert.ok(!JSON.stringify(reserva.body).includes('5599887766'), 'el teléfono no aparece en ningún valor');
  });
});
