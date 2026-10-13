import { body, query } from 'express-validator';
import {
  amountField,
  dateQuery,
  dateRangeQuery,
  forbiddenFields,
  idParam,
  motivoField,
  paginationQuery,
  searchQuery,
} from './common.js';

export const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia'];

export const registerPaymentRules = [
  body('id_membresia').isInt({ min: 1 }).withMessage('Selecciona una membresía válida.').toInt(),
  amountField('monto', { label: 'El monto', positive: true }),
  body('metodo_pago')
    .isIn(PAYMENT_METHODS)
    .withMessage('El método de pago debe ser efectivo, tarjeta o transferencia.'),
  // El cliente, la fecha y el usuario los asigna el servidor
  ...forbiddenFields(['id_cliente', 'fecha_pago', 'estado', 'registrado_por']),
];

export const cancelPaymentRules = [idParam(), motivoField()];

export const clientPaymentsRules = [idParam()];

export const listPaymentsRules = [
  query('id_cliente').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('El cliente no es válido.').toInt(),
  dateQuery('desde', 'La fecha inicial'),
  dateQuery('hasta', 'La fecha final'),
  dateRangeQuery(366),
  query('metodo_pago')
    .optional({ values: 'falsy' })
    .isIn(PAYMENT_METHODS)
    .withMessage('El método de pago debe ser efectivo, tarjeta o transferencia.'),
  query('estado')
    .optional({ values: 'falsy' })
    .isIn(['pagado', 'cancelado'])
    .withMessage('El estado debe ser "pagado" o "cancelado".'),
  ...paginationQuery(),
];

export const listDebtsRules = [searchQuery(), ...paginationQuery()];
