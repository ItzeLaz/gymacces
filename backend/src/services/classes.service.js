import { withTransaction } from '../config/db.js';
import * as classModel from '../models/class.model.js';
import * as reservationModel from '../models/reservation.model.js';
import { businessRule, notFound, validationError } from '../utils/AppError.js';
import { nowInGym } from '../utils/dates.js';
import { ROLES } from '../utils/roles.js';
import { endsSameDay, toHHMM, toMinutes } from '../utils/sessions.js';
import { AUDIT_ACTIONS, record } from './audit.service.js';

// Mensajes de contracts/api.md (historia 1)
const NOT_FOUND = 'La clase no existe.';
const INVALID_INSTRUCTOR = 'El instructor debe ser un entrenador activo.';
const INSTRUCTOR_OVERLAP = 'El instructor ya tiene una clase en ese horario.';
const SAME_DAY = 'La clase debe terminar el mismo día.';
const SCHEDULE_LOCKED = 'No se puede cambiar el horario de una clase con reservas activas.';
const DEACTIVATE_LOCKED = 'No se puede desactivar una clase con reservas activas.';
const capacityBelowReservations = (n) => `El cupo no puede ser menor que las reservas existentes (${n}).`;

const SCHEDULE_FIELDS = ['dia_semana', 'hora_inicio', 'duracion_minutos'];
const DAY_NAMES = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// Forma ClassView del contrato, con la hora de fin calculada
export function toView(clase) {
  const inicio = toMinutes(clase.hora_inicio);
  return {
    id_clase: clase.id_clase,
    nombre: clase.nombre,
    instructor: { id_usuario: clase.id_instructor, nombre: clase.instructor_nombre },
    dia_semana: clase.dia_semana,
    hora_inicio: clase.hora_inicio,
    hora_fin: toHHMM(inicio + clase.duracion_minutos),
    duracion_minutos: clase.duracion_minutos,
    cupo_maximo: clase.cupo_maximo,
    estado: clase.estado,
  };
}

const describe = (clase) =>
  `${clase.nombre}, ${DAY_NAMES[clase.dia_semana]} ${clase.hora_inicio}, ${clase.duracion_minutos} min, cupo ${clase.cupo_maximo}`;

// US1, criterio 14: hora de inicio más duración hasta las 24:00 (research R-06)
function ensureEndsSameDay({ hora_inicio, duracion_minutos }) {
  if (!endsSameDay(toMinutes(hora_inicio), duracion_minutos)) {
    throw validationError([{ field: 'duracion_minutos', message: SAME_DAY }]);
  }
}

// US1, criterio 6: el instructor existe, está activo y tiene rol entrenador
async function ensureActiveTrainer(idInstructor, connection) {
  const instructor = await classModel.lockInstructor(idInstructor, connection);
  if (!instructor || instructor.rol !== ROLES.TRAINER || instructor.estado !== 'activo') {
    throw businessRule(INVALID_INSTRUCTOR);
  }
}

// US1, criterio 5: sin otra clase activa del instructor que se empalme ese día (research R-03)
async function ensureNoInstructorOverlap(clase, excluirId, connection) {
  const inicio = toMinutes(clase.hora_inicio);
  const total = await classModel.countInstructorOverlaps(
    clase.id_instructor,
    clase.dia_semana,
    inicio,
    inicio + clase.duracion_minutos,
    excluirId,
    connection,
  );
  if (total > 0) throw businessRule(INSTRUCTOR_OVERLAP);
}

async function lockOrFail(id, connection) {
  const clase = await classModel.lockById(id, connection);
  if (!clase) throw notFound(NOT_FOUND);
  return clase;
}

// El recepcionista solo ve las clases activas (US1, criterio 12)
export async function listClasses({ estado }, user) {
  const filtro = user.rol === ROLES.ADMIN ? estado : 'activa';
  const clases = await classModel.list({ estado: filtro });
  return clases.map(toView);
}

export async function listInstructors() {
  return classModel.listActiveTrainers();
}

export async function createClass(datos, user) {
  ensureEndsSameDay(datos);
  return withTransaction(async (connection) => {
    await ensureActiveTrainer(datos.id_instructor, connection);
    await ensureNoInstructorOverlap(datos, null, connection);
    const id = await classModel.create({ ...datos, creado_por: user.id_usuario }, connection);
    const clase = await classModel.findById(id, connection);
    await record(connection, user, AUDIT_ACTIONS.CLASS_CREATE, 'clases', id, describe(clase));
    return toView(clase);
  });
}

// Los cambios se aplican a todas las sesiones futuras (US1, criterio 8)
export async function updateClass(id, cambios, user) {
  return withTransaction(async (connection) => {
    const actual = await lockOrFail(id, connection);
    const nueva = { ...actual, ...cambios };
    ensureEndsSameDay(nueva);

    const cambiados = Object.keys(cambios).filter((campo) => String(cambios[campo]) !== String(actual[campo]));
    const cambiaInstructor = cambiados.includes('id_instructor');
    const cambiaHorario = cambiados.some((campo) => SCHEDULE_FIELDS.includes(campo));

    // El estado del instructor solo se valida si cambia (Supuestos del spec; T108)
    if (cambiaInstructor) await ensureActiveTrainer(nueva.id_instructor, connection);
    if (cambiaInstructor || cambiaHorario) await ensureNoInstructorOverlap(nueva, id, connection);

    const ahora = nowInGym();
    if (cambios.cupo_maximo !== undefined && cambios.cupo_maximo < actual.cupo_maximo) {
      const maximo = await reservationModel.maxActiveInFutureSessions(id, ahora.fecha, ahora.minutos, connection);
      if (cambios.cupo_maximo < maximo) throw businessRule(capacityBelowReservations(maximo));
    }
    if (cambiaHorario) {
      const activas = await reservationModel.countActiveInFutureSessions(id, ahora.fecha, ahora.minutos, connection);
      if (activas > 0) throw businessRule(SCHEDULE_LOCKED);
    }

    await classModel.update(id, cambios, connection);
    const detalle = cambiados.map((campo) => `${campo}: ${actual[campo]} → ${cambios[campo]}`).join('; ');
    await record(connection, user, AUDIT_ACTIONS.CLASS_UPDATE, 'clases', id, detalle || 'Sin cambios');
    return toView(await classModel.findById(id, connection));
  });
}

// Solo se puede desactivar si no hay reservas activas en sesiones futuras (US1, criterio 11)
export async function deactivateClass(id, user) {
  return withTransaction(async (connection) => {
    const actual = await lockOrFail(id, connection);
    if (actual.estado === 'inactiva') throw businessRule('La clase ya está inactiva.');
    const ahora = nowInGym();
    const activas = await reservationModel.countActiveInFutureSessions(id, ahora.fecha, ahora.minutos, connection);
    if (activas > 0) throw businessRule(DEACTIVATE_LOCKED);
    await classModel.updateStatus(id, 'inactiva', connection);
    await record(connection, user, AUDIT_ACTIONS.CLASS_DEACTIVATE, 'clases', id, describe(actual));
    return toView(await classModel.findById(id, connection));
  });
}
