import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { resetTestDatabase, createUser, createClient, closePool } from './helpers/db.js';
import {
  createClass,
  createMembership,
  createMembershipType,
  createReservation,
  createTrainer,
} from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

// Reloj fijo: lunes 2026-10-19 a las 08:00 en America/Mexico_City (14:00 UTC). Los tokens se firman
// después de fijar el reloj para que su vigencia use la misma hora (research R-05, R-10).
const AHORA = Date.parse('2026-10-19T14:00:00Z');
const HOY = '2026-10-19'; // lunes (dia_semana 1)
const MARTES = '2026-10-20'; // dia_semana 2
const HOY_MAS_7 = '2026-10-26'; // lunes
const HOY_MAS_8 = '2026-10-27'; // martes

const CLASE_LLENA = 'Clase llena.';
const SIN_MEMBRESIA = 'El cliente no tiene una membresía vigente para la fecha de la clase.';

// Historia 2: reservar un lugar para un cliente (spec.md, criterios US2-1 a US2-8; FR-012; T107)
describe('reservas: reservar un lugar para un cliente', () => {
  let admin;
  let adminToken;
  let recepcion;
  let recepToken;
  let entrenador;
  let tipo;

  before(async () => {
    mock.timers.enable({ apis: ['Date'], now: AHORA });
    await resetTestDatabase();
    admin = await createUser({ rol: 'administrador' });
    recepcion = await createUser({ rol: 'recepcionista' });
    adminToken = tokenFor(admin);
    recepToken = tokenFor(recepcion);
    entrenador = await createTrainer();
    tipo = await createMembershipType();
  });

  after(async () => {
    mock.timers.reset();
    await closePool();
  });

  const reservar = (body, token = recepToken) =>
    request(app).post('/api/reservations').set(bearer(token)).send(body);

  // Cliente activo con membresía activa que cubre todo octubre y noviembre
  async function clienteConMembresia(datosMembresia = {}, datosCliente = {}) {
    const cliente = await createClient(datosCliente);
    await createMembership({
      id_cliente: cliente.id_cliente,
      id_tipo_membresia: tipo.id_tipo_membresia,
      fecha_inicio: '2026-10-01',
      fecha_fin: '2026-11-30',
      ...datosMembresia,
    });
    return cliente;
  }

  // Cada clase usa su propio entrenador para no chocar con la regla de empalme del instructor
  async function clase(datos = {}) {
    const instructor = datos.id_instructor ? { id_usuario: datos.id_instructor } : await createTrainer();
    return createClass({ id_instructor: instructor.id_usuario, creado_por: admin.id_usuario, dia_semana: 2, ...datos });
  }

  async function activasEnSesion(idClase, fecha) {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS total FROM reservas WHERE id_clase = ? AND fecha_sesion = ? AND estado = 'activa'",
      [idClase, fecha],
    );
    return Number(rows[0].total);
  }

  it('reserva_lugar_para_cliente_con_membresia_activa_y_reduce_los_lugares', async () => {
    const spinning = await clase({ cupo_maximo: 2 });
    const cliente = await clienteConMembresia();

    const response = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });

    assert.equal(response.status, 201, 'la reserva válida debe responder 201');
    assert.equal(response.body.data.estado, 'activa');
    assert.equal(response.body.data.asistencia, 'sin_registrar');
    assert.equal(response.body.data.registrada_en_curso, false);
    assert.equal(response.body.data.fecha_sesion, MARTES);
    assert.equal(response.body.data.cliente.id_cliente, cliente.id_cliente);
    assert.equal(response.body.data.registrado_por.id_usuario, recepcion.id_usuario);
    assert.equal(await activasEnSesion(spinning.id_clase, MARTES), 1, 'quedan 1 de 2 lugares');
  });

  it('rechaza_reserva_en_clase_llena', async () => {
    const spinning = await clase({ cupo_maximo: 2 });
    for (let i = 0; i < 2; i += 1) {
      const cliente = await clienteConMembresia();
      const ok = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
      assert.equal(ok.status, 201);
    }
    const tercero = await clienteConMembresia();
    const response = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: tercero.id_cliente });

    assert.equal(response.status, 422);
    assert.equal(response.body.error.message, CLASE_LLENA);
    assert.equal(await activasEnSesion(spinning.id_clase, MARTES), 2, 'nunca más reservas que el cupo');
  });

  it('rechaza_reserva_si_la_membresia_no_cubre_la_fecha_de_la_sesion', async () => {
    const spinning = await clase();
    const casos = [
      ['sin membresía', null],
      ['vencida', { fecha_inicio: '2026-09-01', fecha_fin: '2026-09-30' }],
      ['suspendida', { estado: 'suspendida' }],
      ['cancelada', { estado: 'cancelada' }],
      ['activa hoy pero vence antes de la sesión', { fecha_inicio: '2026-10-01', fecha_fin: HOY }],
    ];
    for (const [caso, membresia] of casos) {
      const cliente = membresia ? await clienteConMembresia(membresia) : await createClient();
      const response = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
      assert.equal(response.status, 422, `${caso} debe rechazarse`);
      assert.equal(response.body.error.message, SIN_MEMBRESIA, caso);
    }
  });

  it('rechaza_reserva_de_cliente_inexistente_o_inactivo_y_en_clase_inactiva', async () => {
    const spinning = await clase();
    const inactivo = await clienteConMembresia({}, { estado: 'inactivo' });
    for (const idCliente of [999999, inactivo.id_cliente]) {
      const response = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: idCliente });
      assert.equal(response.status, 422, `el cliente ${idCliente} debe rechazarse`);
      assert.equal(response.body.error.message, 'Cliente no encontrado o inactivo.');
    }

    const inactiva = await clase({ estado: 'inactiva' });
    const cliente = await clienteConMembresia();
    const enInactiva = await reservar({ id_clase: inactiva.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
    assert.equal(enInactiva.status, 422, 'US1-12: no se reserva en una clase desactivada');
    assert.equal(enInactiva.body.error.message, 'La clase está inactiva.');

    const inexistente = await reservar({ id_clase: 999999, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
    assert.equal(inexistente.status, 404);
    assert.equal(inexistente.body.error.message, 'La clase no existe.');
  });

  it('rechaza_reserva_duplicada_del_mismo_cliente_en_la_sesion', async () => {
    const spinning = await clase();
    const cliente = await clienteConMembresia();
    const datos = { id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente };
    assert.equal((await reservar(datos)).status, 201);

    const response = await reservar(datos);
    assert.equal(response.status, 409);
    assert.equal(response.body.error.message, 'El cliente ya tiene una reserva en esta clase.');
    assert.equal(await activasEnSesion(spinning.id_clase, MARTES), 1);
  });

  it('rechaza_reserva_que_se_empalma_con_otra_del_cliente_el_mismo_dia', async () => {
    const spinning = await clase({ hora_inicio: '07:00', duracion_minutos: 45 });
    const yoga = await clase({ nombre: 'Yoga', hora_inicio: '07:30', duracion_minutos: 60 });
    const contigua = await clase({ nombre: 'Funcional', hora_inicio: '07:45', duracion_minutos: 30 });
    const otroDia = await clase({ nombre: 'Yoga lunes', dia_semana: 1, hora_inicio: '18:30', duracion_minutos: 60 });
    const cliente = await clienteConMembresia();
    assert.equal((await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente })).status, 201);

    const empalmada = await reservar({ id_clase: yoga.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
    assert.equal(empalmada.status, 422);
    assert.equal(
      empalmada.body.error.message,
      'El cliente ya tiene una reserva en una clase que se empalma con este horario.',
    );

    const despues = await reservar({ id_clase: contigua.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
    assert.equal(despues.status, 201, 'una clase contigua (07:45) no se empalma');
    const lunes = await reservar({ id_clase: otroDia.id_clase, fecha_sesion: HOY_MAS_7, id_cliente: cliente.id_cliente });
    assert.equal(lunes.status, 201, 'en otra fecha no hay empalme');
  });

  it('rechaza_reserva_en_sesion_terminada_o_fuera_de_la_ventana_de_7_dias', async () => {
    const mensaje = 'Solo se puede reservar en clases que no han terminado y dentro de los próximos 7 días.';
    const temprano = await clase({ dia_semana: 1, hora_inicio: '06:00', duracion_minutos: 60 });
    const martes = await clase({ dia_semana: 2, hora_inicio: '19:00' });
    const cliente = await clienteConMembresia();

    const terminada = await reservar({ id_clase: temprano.id_clase, fecha_sesion: HOY, id_cliente: cliente.id_cliente });
    assert.equal(terminada.status, 422, 'la sesión de 06:00–07:00 ya terminó a las 08:00');
    assert.equal(terminada.body.error.message, mensaje);

    const lejana = await reservar({ id_clase: martes.id_clase, fecha_sesion: HOY_MAS_8, id_cliente: cliente.id_cliente });
    assert.equal(lejana.status, 422, 'hoy + 8 queda fuera de la ventana');
    assert.equal(lejana.body.error.message, mensaje);

    const pasada = await reservar({ id_clase: temprano.id_clase, fecha_sesion: '2026-10-12', id_cliente: cliente.id_cliente });
    assert.equal(pasada.status, 422, 'una sesión de la semana pasada ya terminó');

    const limite = await reservar({ id_clase: temprano.id_clase, fecha_sesion: HOY_MAS_7, id_cliente: cliente.id_cliente });
    assert.equal(limite.status, 201, 'hoy + 7 está dentro de la ventana');

    const otroDia = await reservar({ id_clase: martes.id_clase, fecha_sesion: HOY, id_cliente: cliente.id_cliente });
    assert.equal(otroDia.status, 400, 'la fecha debe corresponder al día de la clase');
    assert.ok(otroDia.body.error.details.some((detail) => detail.field === 'fecha_sesion'));
  });

  it('reserva_en_sesion_en_curso_queda_con_asistencia_presente', async () => {
    const enCurso = await clase({ dia_semana: 1, hora_inicio: '07:30', duracion_minutos: 60, cupo_maximo: 1 });
    const cliente = await clienteConMembresia();

    const response = await reservar({ id_clase: enCurso.id_clase, fecha_sesion: HOY, id_cliente: cliente.id_cliente });
    assert.equal(response.status, 201, 'a las 08:00 la sesión de 07:30–08:30 está en curso');
    assert.equal(response.body.data.asistencia, 'presente');
    assert.equal(response.body.data.registrada_en_curso, true);

    const [rows] = await pool.execute(
      'SELECT asistencia_por, asistencia_en, creado_en FROM reservas WHERE id_reserva = ?',
      [response.body.data.id_reserva],
    );
    assert.equal(rows[0].asistencia_por, recepcion.id_usuario);
    assert.equal(rows[0].asistencia_en.getTime(), rows[0].creado_en.getTime(), 'ambas fechas usan el mismo reloj');

    const otro = await clienteConMembresia();
    const llena = await reservar({ id_clase: enCurso.id_clase, fecha_sesion: HOY, id_cliente: otro.id_cliente });
    assert.equal(llena.status, 422, 'en curso pero sin lugares');
    assert.equal(llena.body.error.message, CLASE_LLENA);
  });

  it('registra_auditoria_al_reservar', async () => {
    const spinning = await clase();
    const cliente = await clienteConMembresia();
    const response = await reservar(
      { id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente },
      adminToken,
    );

    const [filas] = await pool.execute(
      "SELECT accion, id_usuario, descripcion FROM auditoria WHERE entidad = 'reservas' AND id_registro = ?",
      [response.body.data.id_reserva],
    );
    assert.equal(filas.length, 1);
    assert.equal(filas[0].accion, 'reserva.registrar');
    assert.equal(filas[0].id_usuario, admin.id_usuario, 'el administrador también puede reservar');
    assert.match(filas[0].descripcion, new RegExp(`cliente ${cliente.id_cliente}`));
  });

  it('la_reserva_se_conserva_si_la_membresia_se_cancela_despues', async () => {
    const spinning = await clase({ cupo_maximo: 2 });
    for (const estado of ['cancelada', 'suspendida']) {
      const cliente = await createClient();
      const membresia = await createMembership({
        id_cliente: cliente.id_cliente,
        id_tipo_membresia: tipo.id_tipo_membresia,
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-11-30',
      });
      const reserva = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
      assert.equal(reserva.status, 201);

      const cambio = await request(app)
        .patch(`/api/memberships/${membresia.id_membresia}/status`)
        .set(bearer(adminToken))
        .send({ estado, motivo: 'Prueba del caso límite' });
      assert.equal(cambio.status, 200, `la membresía debe quedar ${estado}`);

      const [rows] = await pool.execute('SELECT estado FROM reservas WHERE id_reserva = ?', [reserva.body.data.id_reserva]);
      assert.equal(rows[0].estado, 'activa', `la reserva se conserva con la membresía ${estado}`);
    }
    assert.equal(await activasEnSesion(spinning.id_clase, MARTES), 2, 'las dos reservas siguen ocupando su lugar');
  });

  it('rechaza_datos_con_formato_invalido', async () => {
    const response = await reservar({ id_clase: 'x', fecha_sesion: '2026-02-30', id_cliente: 0 });
    assert.equal(response.status, 400);
    const campos = response.body.error.details.map((detail) => detail.field).sort();
    assert.deepEqual(campos, ['fecha_sesion', 'id_clase', 'id_cliente']);
  });

  it('la_fabrica_de_reservas_sigue_disponible', async () => {
    // Las reservas creadas por fábrica también cuentan para el cupo
    const spinning = await clase({ cupo_maximo: 1 });
    const ocupante = await clienteConMembresia();
    await createReservation({
      id_clase: spinning.id_clase,
      fecha_sesion: MARTES,
      id_cliente: ocupante.id_cliente,
      registrado_por: admin.id_usuario,
    });
    const cliente = await clienteConMembresia();
    const response = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
    assert.equal(response.body.error?.message, CLASE_LLENA);
  });

  // Historia 3: cancelar la reserva de un cliente (spec.md, criterios US3-1 a US3-4)
  const cancelar = (idReserva, token = recepToken) =>
    request(app).patch(`/api/reservations/${idReserva}/cancel`).set(bearer(token));

  it('cancelar_reserva_de_sesion_pendiente_libera_el_lugar_y_la_conserva', async () => {
    const spinning = await clase({ cupo_maximo: 1 });
    const cliente = await clienteConMembresia();
    const reserva = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
    assert.equal(await activasEnSesion(spinning.id_clase, MARTES), 1, 'la sesión empieza llena');

    const response = await cancelar(reserva.body.data.id_reserva);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.estado, 'cancelada');

    const [rows] = await pool.execute(
      'SELECT estado, cancelado_por, cancelado_en FROM reservas WHERE id_reserva = ?',
      [reserva.body.data.id_reserva],
    );
    assert.equal(rows.length, 1, 'la reserva cancelada se conserva en el historial');
    assert.equal(rows[0].estado, 'cancelada');
    assert.equal(rows[0].cancelado_por, recepcion.id_usuario);
    assert.equal(rows[0].cancelado_en.getTime(), AHORA, 'la fecha de cancelación viene del reloj de Node');
    assert.equal(await activasEnSesion(spinning.id_clase, MARTES), 0, 'el lugar se libera');

    const otro = await clienteConMembresia();
    const nueva = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: otro.id_cliente });
    assert.equal(nueva.status, 201, 'otro cliente puede tomar el lugar liberado');

    const [audit] = await pool.execute(
      "SELECT accion, id_usuario FROM auditoria WHERE entidad = 'reservas' AND id_registro = ? ORDER BY id_auditoria",
      [reserva.body.data.id_reserva],
    );
    assert.deepEqual(audit.map((fila) => fila.accion), ['reserva.registrar', 'reserva.cancelar']);
    assert.equal(audit[1].id_usuario, recepcion.id_usuario);
  });

  it('rechaza_cancelar_reserva_de_clase_que_ya_empezo', async () => {
    const mensaje = 'No se puede cancelar una reserva de una clase que ya empezó.';
    const enCurso = await clase({ dia_semana: 1, hora_inicio: '07:30', duracion_minutos: 60 });
    const terminada = await clase({ dia_semana: 1, hora_inicio: '06:00', duracion_minutos: 60 });
    for (const [caso, sesion] of [['en curso', enCurso], ['terminada', terminada]]) {
      const cliente = await clienteConMembresia();
      const reserva = await createReservation({
        id_clase: sesion.id_clase,
        fecha_sesion: HOY,
        id_cliente: cliente.id_cliente,
        registrado_por: admin.id_usuario,
      });
      const response = await cancelar(reserva.id_reserva);
      assert.equal(response.status, 422, `una sesión ${caso} no se puede cancelar`);
      assert.equal(response.body.error.message, mensaje);
      const [rows] = await pool.execute('SELECT estado FROM reservas WHERE id_reserva = ?', [reserva.id_reserva]);
      assert.equal(rows[0].estado, 'activa', 'la reserva no cambia');
    }
  });

  it('rechaza_cancelar_una_reserva_ya_cancelada', async () => {
    const spinning = await clase();
    const cliente = await clienteConMembresia();
    const reserva = await reservar({ id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente });
    assert.equal((await cancelar(reserva.body.data.id_reserva)).status, 200);

    const otraVez = await cancelar(reserva.body.data.id_reserva);
    assert.equal(otraVez.status, 422);
    assert.equal(otraVez.body.error.message, 'La reserva ya está cancelada.');

    const inexistente = await cancelar(999999);
    assert.equal(inexistente.status, 404);
    assert.equal(inexistente.body.error.message, 'La reserva no existe.');

    const invalida = await cancelar('abc');
    assert.equal(invalida.status, 400);
  });

  it('el_cliente_puede_volver_a_reservar_despues_de_cancelar', async () => {
    const spinning = await clase();
    const cliente = await clienteConMembresia();
    const datos = { id_clase: spinning.id_clase, fecha_sesion: MARTES, id_cliente: cliente.id_cliente };
    const primera = await reservar(datos);
    await cancelar(primera.body.data.id_reserva);

    const segunda = await reservar(datos);
    assert.equal(segunda.status, 201, 'después de cancelar puede volver a reservar');
    const [rows] = await pool.execute(
      'SELECT estado, COUNT(*) AS total FROM reservas WHERE id_clase = ? AND id_cliente = ? GROUP BY estado ORDER BY estado',
      [spinning.id_clase, cliente.id_cliente],
    );
    assert.deepEqual(
      rows.map((row) => [row.estado, Number(row.total)]),
      [['activa', 1], ['cancelada', 1]],
    );
  });
});
