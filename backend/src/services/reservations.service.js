import { withTransaction } from '../config/db.js';
import * as classModel from '../models/class.model.js';
import * as clientModel from '../models/client.model.js';
import * as membershipModel from '../models/membership.model.js';
import * as reservationModel from '../models/reservation.model.js';
import { businessRule, conflict, notFound, validationError } from '../utils/AppError.js';
import { nowInGym } from '../utils/dates.js';
import { isInBookingWindow, isoWeekday, sessionState, toMinutes } from '../utils/sessions.js';
import { AUDIT_ACTIONS, record } from './audit.service.js';

// Mensajes de contracts/api.md (historia 2)
const CLASS_NOT_FOUND = 'La clase no existe.';
const CLASS_INACTIVE = 'La clase está inactiva.';
const OUTSIDE_WINDOW = 'Solo se puede reservar en clases que no han terminado y dentro de los próximos 7 días.';
const CLIENT_UNAVAILABLE = 'Cliente no encontrado o inactivo.';
const NO_MEMBERSHIP = 'El cliente no tiene una membresía vigente para la fecha de la clase.';
const DUPLICATE = 'El cliente ya tiene una reserva en esta clase.';
const CLIENT_OVERLAP = 'El cliente ya tiene una reserva en una clase que se empalma con este horario.';
const FULL = 'Clase llena.';
const RESERVATION_NOT_FOUND = 'La reserva no existe.';
const ALREADY_CANCELLED = 'La reserva ya está cancelada.';
const ALREADY_STARTED = 'No se puede cancelar una reserva de una clase que ya empezó.';
const NOT_STARTED = 'La asistencia solo se puede registrar a partir de la hora de inicio de la clase.';
const DAY_OVER = 'La asistencia solo se puede registrar el mismo día de la clase.';
const NOT_ACTIVE = 'El cliente no tiene una reserva activa en esta clase.';

// "No asistió": reserva activa sin asistencia de una sesión de un día anterior (US5, criterio 6)
export function attendanceLabel(fila, hoy) {
  if (fila.asistencia === 'presente') return 'Presente';
  if (fila.estado === 'activa' && fila.fecha_sesion < hoy) return 'No asistió';
  return 'Sin registrar';
}

// Forma ReservationView del contrato; nunca incluye datos de contacto del cliente
export function toView(fila, hoy = nowInGym().fecha) {
  return {
    id_reserva: fila.id_reserva,
    id_clase: fila.id_clase,
    fecha_sesion: fila.fecha_sesion,
    cliente: { id_cliente: fila.id_cliente, nombre: fila.cliente_nombre, apellido: fila.cliente_apellido },
    estado: fila.estado,
    asistencia: fila.asistencia,
    asistencia_mostrada: attendanceLabel(fila, hoy),
    registrada_en_curso: Boolean(fila.registrada_en_curso),
    registrado_por: { id_usuario: fila.registrado_por, nombre: fila.registrado_por_nombre },
    creado_en: fila.creado_en,
  };
}

// Reserva un lugar con bloqueos cliente → clase para que el cupo nunca se supere (research R-02).
// Las reglas se evalúan en el orden de contracts/api.md.
export async function createReservation({ id_clase, fecha_sesion, id_cliente }, user) {
  const ahora = new Date();
  const hoy = nowInGym(ahora);
  try {
    return await withTransaction(async (connection) => {
      const cliente = await clientModel.lockById(id_cliente, connection);
      const clase = await classModel.lockById(id_clase, connection);
      if (!clase) throw notFound(CLASS_NOT_FOUND);
      if (clase.estado !== 'activa') throw businessRule(CLASS_INACTIVE);
      if (isoWeekday(fecha_sesion) !== clase.dia_semana) {
        throw validationError([{ field: 'fecha_sesion', message: 'La fecha no corresponde al día de la clase.' }]);
      }

      const inicio = toMinutes(clase.hora_inicio);
      const fin = inicio + clase.duracion_minutos;
      const estadoSesion = sessionState(fecha_sesion, inicio, fin, hoy);
      if (estadoSesion === 'terminada' || !isInBookingWindow(fecha_sesion, hoy.fecha)) {
        throw businessRule(OUTSIDE_WINDOW);
      }

      if (!cliente || cliente.estado !== 'activo') throw businessRule(CLIENT_UNAVAILABLE);
      // Misma regla de vigencia del Sprint 2, evaluada en la fecha de la sesión (research R-07)
      const membresia = await membershipModel.findCurrentByClient(id_cliente, fecha_sesion, connection);
      if (!membresia || !membresia.vigente) throw businessRule(NO_MEMBERSHIP);

      if (await reservationModel.existsActive(id_clase, fecha_sesion, id_cliente, connection)) throw conflict(DUPLICATE);
      if ((await reservationModel.countClientOverlaps(id_cliente, fecha_sesion, inicio, fin, connection)) > 0) {
        throw businessRule(CLIENT_OVERLAP);
      }
      if ((await reservationModel.countActiveBySession(id_clase, fecha_sesion, connection)) >= clase.cupo_maximo) {
        throw businessRule(FULL);
      }

      // Si la clase ya empezó, quien llega sin reserva queda presente (US2, criterio 8)
      const enCurso = estadoSesion === 'en_curso';
      const id = await reservationModel.create(
        {
          id_clase,
          fecha_sesion,
          id_cliente,
          registrado_por: user.id_usuario,
          creado_en: ahora,
          asistencia: enCurso ? 'presente' : 'sin_registrar',
          asistencia_por: enCurso ? user.id_usuario : null,
          asistencia_en: enCurso ? ahora : null,
          registrada_en_curso: enCurso ? 1 : 0,
        },
        connection,
      );
      await record(
        connection,
        user,
        AUDIT_ACTIONS.RESERVATION_CREATE,
        'reservas',
        id,
        `${clase.nombre} ${fecha_sesion} ${clase.hora_inicio}, cliente ${id_cliente}${enCurso ? ', registrada en curso' : ''}`,
      );
      return toView(await reservationModel.findById(id, connection), hoy.fecha);
    });
  } catch (error) {
    // La llave única es la segunda defensa contra duplicados (research R-02)
    if (error.code === 'ER_DUP_ENTRY') throw conflict(DUPLICATE);
    throw error;
  }
}

// Bloquea la reserva o responde 404 (US3, US5)
async function lockReservationOrFail(id, connection) {
  const reserva = await reservationModel.lockById(id, connection);
  if (!reserva) throw notFound(RESERVATION_NOT_FOUND);
  return reserva;
}

// Estado de la sesión de una reserva bloqueada, con la hora del gimnasio
function stateOf(reserva, ahora) {
  const inicio = toMinutes(reserva.hora_inicio);
  return sessionState(reserva.fecha_sesion, inicio, inicio + reserva.duracion_minutos, ahora);
}

// Cancela solo antes de que empiece la clase; el lugar se libera y la reserva se conserva (US3)
export async function cancelReservation(id, user) {
  const ahora = new Date();
  const hoy = nowInGym(ahora);
  return withTransaction(async (connection) => {
    const reserva = await lockReservationOrFail(id, connection);
    if (reserva.estado === 'cancelada') throw businessRule(ALREADY_CANCELLED);
    if (stateOf(reserva, hoy) !== 'pendiente') throw businessRule(ALREADY_STARTED);

    await reservationModel.cancel(id, user.id_usuario, ahora, connection);
    await record(
      connection,
      user,
      AUDIT_ACTIONS.RESERVATION_CANCEL,
      'reservas',
      id,
      `${reserva.clase_nombre} ${reserva.fecha_sesion} ${reserva.hora_inicio}, cliente ${reserva.id_cliente}`,
    );
    return toView(await reservationModel.findById(id, connection), hoy.fecha);
  });
}

// Marca o desmarca la asistencia el día de la sesión, desde su hora de inicio (US5, criterios 1 a 5)
export async function setAttendance(id, presente, user) {
  const ahora = new Date();
  const hoy = nowInGym(ahora);
  return withTransaction(async (connection) => {
    const reserva = await lockReservationOrFail(id, connection);
    if (reserva.estado !== 'activa') throw businessRule(NOT_ACTIVE);
    const inicio = toMinutes(reserva.hora_inicio);
    if (reserva.fecha_sesion > hoy.fecha || (reserva.fecha_sesion === hoy.fecha && hoy.minutos < inicio)) {
      throw businessRule(NOT_STARTED);
    }
    if (reserva.fecha_sesion < hoy.fecha) throw businessRule(DAY_OVER);

    await reservationModel.setAttendance(id, presente, user.id_usuario, ahora, connection);
    return toView(await reservationModel.findById(id, connection), hoy.fecha);
  });
}
