import { describe, it, before, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { resetTestDatabase, createUser, createClient, closePool } from './helpers/db.js';
import { createClass, createReservation, createTrainer } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

// Reloj base: lunes 2026-10-19 a las 08:00 en America/Mexico_City (14:00 UTC)
const AHORA = Date.parse('2026-10-19T14:00:00Z');
const MEDIODIA = Date.parse('2026-10-19T18:00:00Z'); // 12:00 del mismo lunes
const DIA_SIGUIENTE = Date.parse('2026-10-20T14:00:00Z'); // martes 08:00
const HOY = '2026-10-19';
const MARTES = '2026-10-20';

const ANTES_DEL_INICIO = 'La asistencia solo se puede registrar a partir de la hora de inicio de la clase.';
const DESPUES_DEL_DIA = 'La asistencia solo se puede registrar el mismo día de la clase.';
const SIN_RESERVA_ACTIVA = 'El cliente no tiene una reserva activa en esta clase.';

// Historia 5: marcar asistencia de los reservados (spec.md, criterios US5-1 a US5-6)
describe('asistencia a las clases', () => {
  let admin;
  let recepcion;
  let enCurso;
  let tarde;
  let manana;

  before(async () => {
    mock.timers.enable({ apis: ['Date'], now: AHORA });
    await resetTestDatabase();
    admin = await createUser({ rol: 'administrador' });
    recepcion = await createUser({ rol: 'recepcionista' });
    const instructor = await createTrainer();
    const otro = await createTrainer();
    // Lunes 07:30–08:30: a las 08:00 está en curso
    enCurso = await createClass({ id_instructor: instructor.id_usuario, dia_semana: 1, hora_inicio: '07:30', duracion_minutos: 60 });
    // Lunes 18:00: todavía no empieza
    tarde = await createClass({ id_instructor: instructor.id_usuario, dia_semana: 1, hora_inicio: '18:00' });
    // Martes 07:00: es mañana
    manana = await createClass({ id_instructor: otro.id_usuario, dia_semana: 2, hora_inicio: '07:00' });
  });

  beforeEach(() => mock.timers.setTime(AHORA));

  after(async () => {
    mock.timers.reset();
    await closePool();
  });

  // El token se firma con el reloj actual para que siga vigente cuando la prueba mueve la hora
  const marcar = (idReserva, body, usuario = recepcion) =>
    request(app).patch(`/api/reservations/${idReserva}/attendance`).set(bearer(tokenFor(usuario))).send(body);

  async function reserva(clase, fecha, datos = {}) {
    const cliente = await createClient(datos.cliente);
    return createReservation({
      id_clase: clase.id_clase,
      fecha_sesion: fecha,
      id_cliente: cliente.id_cliente,
      registrado_por: admin.id_usuario,
      ...datos.reserva,
    });
  }

  const filaDe = async (idReserva) => {
    const [rows] = await pool.execute(
      'SELECT estado, asistencia, asistencia_por, asistencia_en FROM reservas WHERE id_reserva = ?',
      [idReserva],
    );
    return rows[0];
  };

  it('marca_presente_a_cliente_con_reserva_en_sesion_iniciada_hoy', async () => {
    const enLaClase = await reserva(enCurso, HOY);
    const response = await marcar(enLaClase.id_reserva, { presente: true });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.asistencia, 'presente');
    assert.equal(response.body.data.asistencia_mostrada, 'Presente');
    const fila = await filaDe(enLaClase.id_reserva);
    assert.equal(fila.asistencia_por, recepcion.id_usuario, 'se guarda quién la marcó');
    assert.equal(fila.asistencia_en.getTime(), AHORA, 'se guarda la fecha y hora desde el reloj de Node');

    // La sesión ya terminó, pero sigue siendo el mismo día
    mock.timers.setTime(MEDIODIA);
    const despues = await reserva(enCurso, HOY);
    const tardia = await marcar(despues.id_reserva, { presente: true });
    assert.equal(tardia.status, 200, 'se puede marcar hasta el final del día de la sesión');
  });

  it('rechaza_marcar_asistencia_antes_de_la_hora_de_inicio', async () => {
    for (const [caso, clase, fecha] of [['más tarde hoy', tarde, HOY], ['mañana', manana, MARTES]]) {
      const pendiente = await reserva(clase, fecha);
      const response = await marcar(pendiente.id_reserva, { presente: true });
      assert.equal(response.status, 422, `una sesión de ${caso} todavía no empieza`);
      assert.equal(response.body.error.message, ANTES_DEL_INICIO);
      assert.equal((await filaDe(pendiente.id_reserva)).asistencia, 'sin_registrar');
    }
  });

  it('rechaza_marcar_asistencia_despues_del_dia_de_la_sesion', async () => {
    const ayer = await reserva(enCurso, HOY);
    mock.timers.setTime(DIA_SIGUIENTE);
    const response = await marcar(ayer.id_reserva, { presente: true });
    assert.equal(response.status, 422);
    assert.equal(response.body.error.message, DESPUES_DEL_DIA);
  });

  it('rechaza_marcar_asistencia_de_reserva_cancelada', async () => {
    const cancelada = await reserva(enCurso, HOY, { reserva: { estado: 'cancelada' } });
    const response = await marcar(cancelada.id_reserva, { presente: true });
    assert.equal(response.status, 422);
    assert.equal(response.body.error.message, SIN_RESERVA_ACTIVA);

    const inexistente = await marcar(999999, { presente: true });
    assert.equal(inexistente.status, 404);
    assert.equal(inexistente.body.error.message, 'La reserva no existe.');

    const activa = await reserva(enCurso, HOY);
    for (const presente of ['si', 1, undefined]) {
      const invalido = await marcar(activa.id_reserva, { presente });
      assert.equal(invalido.status, 400, `presente=${presente} debe rechazarse`);
      assert.ok(invalido.body.error.details.some((detail) => detail.field === 'presente'));
    }
  });

  it('desmarcar_asistencia_el_mismo_dia_regresa_a_sin_registrar', async () => {
    const enLaClase = await reserva(enCurso, HOY);
    assert.equal((await marcar(enLaClase.id_reserva, { presente: true })).status, 200);

    const response = await marcar(enLaClase.id_reserva, { presente: false });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.asistencia, 'sin_registrar');
    const fila = await filaDe(enLaClase.id_reserva);
    assert.equal(fila.asistencia, 'sin_registrar');
    assert.equal(fila.asistencia_por, null);
    assert.equal(fila.asistencia_en, null);

    // Una reserva hecha durante la clase también se puede desmarcar (US2, criterio 8)
    const sinReserva = await reserva(enCurso, HOY, {
      reserva: { asistencia: 'presente', registrada_en_curso: 1 },
    });
    const desmarcada = await marcar(sinReserva.id_reserva, { presente: false });
    assert.equal(desmarcada.status, 200);
    assert.equal(desmarcada.body.data.registrada_en_curso, true, 'sigue indicando que se registró en curso');
  });

  it('al_terminar_el_dia_las_reservas_sin_asistencia_se_muestran_como_no_asistio', async () => {
    const clase = await createClass({
      id_instructor: (await createTrainer()).id_usuario,
      dia_semana: 1,
      hora_inicio: '07:00',
      duracion_minutos: 30,
    });
    const presente = await reserva(clase, HOY, { cliente: { apellido: 'Aguilar' } });
    const ausente = await reserva(clase, HOY, { cliente: { apellido: 'Zamora' } });
    assert.equal((await marcar(presente.id_reserva, { presente: true })).status, 200);

    const mismoDia = await request(app)
      .get(`/api/classes/${clase.id_clase}/sessions/${HOY}`)
      .set(bearer(tokenFor(recepcion)));
    const hoyMostrado = Object.fromEntries(
      mismoDia.body.data.reservas.map((item) => [item.id_reserva, item.asistencia_mostrada]),
    );
    assert.equal(hoyMostrado[ausente.id_reserva], 'Sin registrar', 'el mismo día todavía no es "No asistió"');

    mock.timers.setTime(DIA_SIGUIENTE);
    const response = await request(app)
      .get(`/api/classes/${clase.id_clase}/sessions/${HOY}`)
      .set(bearer(tokenFor(recepcion)));
    const mostrado = Object.fromEntries(
      response.body.data.reservas.map((item) => [item.id_reserva, item.asistencia_mostrada]),
    );
    assert.equal(mostrado[presente.id_reserva], 'Presente');
    assert.equal(mostrado[ausente.id_reserva], 'No asistió');
  });
});
