import { body } from 'express-validator';
import { amountField, forbiddenFields, idParam, motivoField } from './common.js';

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
