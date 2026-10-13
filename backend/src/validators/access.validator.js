import { body, query } from 'express-validator';
import { dateQuery, dateRangeQuery, paginationQuery } from './common.js';
import { isValidDescriptor } from '../utils/faceMatching.js';

// El mensaje nunca repite el descriptor recibido (FR-030)
export const accessAttemptRules = [
  body('descriptor')
    .custom((value) => value === null || isValidDescriptor(value))
    .withMessage('La captura facial no es válida.'),
];

export const ACCESS_REASONS = [
  'rostro_no_identificado',
  'cliente_inactivo',
  'sin_membresia_vigente',
  'membresia_vencida',
  'membresia_suspendida',
  'membresia_cancelada',
];

export const listAccessRules = [
  dateQuery('desde', 'La fecha inicial'),
  dateQuery('hasta', 'La fecha final'),
  dateRangeQuery(366),
  query('id_cliente').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('El cliente no es válido.').toInt(),
  query('resultado')
    .optional({ values: 'falsy' })
    .isIn(['autorizado', 'rechazado'])
    .withMessage('El resultado debe ser "autorizado" o "rechazado".'),
  query('motivo').optional({ values: 'falsy' }).isIn(ACCESS_REASONS).withMessage('El motivo no es válido.'),
  ...paginationQuery(),
];

export const ownAccessRules = [...paginationQuery()];
