import { body, param, query } from 'express-validator';
import { isValidDate } from '../utils/dates.js';
import { dateQuery, forbiddenFields, idParam } from './common.js';

// Mensajes de contracts/api.md (US1-2, US1-3, US1-4). La regla "termina el mismo día" (US1-14)
// se valida en el servicio, porque al modificar necesita los valores actuales de la clase.
export const DURATION_MESSAGE = 'La duración debe estar entre 15 y 240 minutos.';
export const CAPACITY_MESSAGE = 'El cupo debe estar entre 1 y 100 lugares.';

const EDITABLE = ['nombre', 'id_instructor', 'dia_semana', 'hora_inicio', 'duracion_minutos', 'cupo_maximo'];
const NOT_EDITABLE = ['estado', 'id_clase'];

const nombreField = () =>
  body('nombre')
    .exists({ values: 'null' })
    .withMessage('El nombre es obligatorio.')
    .bail()
    .isString()
    .withMessage('El nombre debe tener entre 1 y 80 caracteres.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('El nombre debe tener entre 1 y 80 caracteres.');

const instructorField = () =>
  body('id_instructor')
    .exists({ values: 'null' })
    .withMessage('El instructor es obligatorio.')
    .bail()
    .isInt({ min: 1 })
    .withMessage('El instructor no es válido.')
    .toInt();

const diaField = () =>
  body('dia_semana')
    .exists({ values: 'null' })
    .withMessage('El día de la semana es obligatorio.')
    .bail()
    .isInt({ min: 1, max: 7 })
    .withMessage('El día de la semana debe ser un número del 1 (lunes) al 7 (domingo).')
    .toInt();

const horaField = () =>
  body('hora_inicio')
    .exists({ values: 'null' })
    .withMessage('La hora de inicio es obligatoria.')
    .bail()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('La hora de inicio debe tener el formato HH:MM (24 horas).');

const duracionField = () =>
  body('duracion_minutos')
    .exists({ values: 'null' })
    .withMessage('La duración es obligatoria.')
    .bail()
    .isInt({ min: 15, max: 240 })
    .withMessage(DURATION_MESSAGE)
    .toInt();

const cupoField = () =>
  body('cupo_maximo')
    .exists({ values: 'null' })
    .withMessage('El cupo es obligatorio.')
    .bail()
    .isInt({ min: 1, max: 100 })
    .withMessage(CAPACITY_MESSAGE)
    .toInt();

export const createClassRules = [
  nombreField(),
  instructorField(),
  diaField(),
  horaField(),
  duracionField(),
  cupoField(),
  ...forbiddenFields(NOT_EDITABLE),
];

export const updateClassRules = [
  idParam(),
  body()
    .custom((value) => EDITABLE.some((field) => value?.[field] !== undefined))
    .withMessage('Envía al menos un campo para modificar.'),
  nombreField().optional(),
  instructorField().optional(),
  diaField().optional(),
  horaField().optional(),
  duracionField().optional(),
  cupoField().optional(),
  ...forbiddenFields(NOT_EDITABLE),
];

// Solo se puede desactivar (FR-001); la reactivación no forma parte del alcance
export const classStatusRules = [
  idParam(),
  body('estado').equals('inactiva').withMessage('El estado solo puede cambiar a "inactiva".'),
];

export const listClassesRules = [
  query('estado')
    .optional()
    .isIn(['activa', 'inactiva'])
    .withMessage('El estado debe ser "activa" o "inactiva".'),
];

// Horario: "desde" opcional; que caiga dentro de la ventana se valida en el servicio (research R-05)
export const scheduleRules = [dateQuery('desde', 'La fecha inicial')];

// Detalle de sesión: la coincidencia de la fecha con el día de la clase se valida en el servicio
export const sessionParams = [
  idParam(),
  param('fecha')
    .custom((value) => isValidDate(value))
    .withMessage('La fecha de la sesión debe ser una fecha válida con formato AAAA-MM-DD.'),
];
