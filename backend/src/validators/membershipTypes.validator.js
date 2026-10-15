import { body, query } from 'express-validator';
import { amountField, forbiddenFields, idParam, paginationQuery, statusField } from './common.js';

const nombreField = () =>
  body('nombre')
    .isString()
    .withMessage('El nombre debe tener entre 2 y 80 caracteres.')
    .bail()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('El nombre debe tener entre 2 y 80 caracteres.');

const descripcionField = () =>
  body('descripcion')
    .optional({ values: 'null' })
    .isString()
    .withMessage('La descripción no es válida.')
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage('La descripción no debe superar 255 caracteres.')
    .customSanitizer((value) => (value === '' ? null : value));

const duracionField = () =>
  body('duracion_dias')
    .isInt({ min: 1, max: 3650 })
    .withMessage('La duración debe ser un número entero de días entre 1 y 3650.')
    .toInt();

const NOT_EDITABLE = ['estado', 'id_tipo_membresia'];

export const createTypeRules = [
  nombreField(),
  descripcionField(),
  duracionField(),
  amountField('precio', { label: 'El precio' }),
  ...forbiddenFields(NOT_EDITABLE),
];

export const updateTypeRules = [
  idParam(),
  nombreField().optional(),
  descripcionField(),
  duracionField().optional(),
  amountField('precio', { label: 'El precio' }).optional(),
  ...forbiddenFields(NOT_EDITABLE),
];

export const typeStatusRules = [idParam(), statusField()];

export const listTypesRules = [
  query('estado').optional().isIn(['activo', 'inactivo']).withMessage('El estado debe ser "activo" o "inactivo".'),
  ...paginationQuery(),
];
