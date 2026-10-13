import { body, param, query } from 'express-validator';
import { daysBetween, isValidDate } from '../utils/dates.js';
import { compareAmounts, fromCents, isValidAmount, MAX_AMOUNT, toCents } from '../utils/money.js';

export const PASSWORD_MESSAGE =
  'La contraseña debe tener entre 8 y 72 caracteres, al menos una letra y un número.';

export const emailField = (field = 'correo') =>
  body(field)
    .trim()
    .toLowerCase()
    .isLength({ max: 120 })
    .withMessage('El correo no debe superar 120 caracteres.')
    .bail()
    .isEmail({ allow_utf8_local_part: false })
    .withMessage('El correo no tiene un formato válido.');

export const passwordField = (field = 'password') =>
  body(field)
    .isString()
    .withMessage(PASSWORD_MESSAGE)
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72 && value.length >= 8)
    .withMessage(PASSWORD_MESSAGE)
    .bail()
    .matches(/[A-Za-z]/)
    .withMessage(PASSWORD_MESSAGE)
    .bail()
    .matches(/\d/)
    .withMessage(PASSWORD_MESSAGE);

export const idParam = (field = 'id') =>
  param(field).isInt({ min: 1 }).withMessage('El identificador no es válido.').toInt();

export const statusField = () =>
  body('estado')
    .exists({ values: 'falsy' })
    .withMessage('El estado es obligatorio.')
    .bail()
    .isIn(['activo', 'inactivo'])
    .withMessage('El estado debe ser "activo" o "inactivo".');

export const statusQuery = () =>
  query('estado')
    .optional()
    .isIn(['activo', 'inactivo'])
    .withMessage('El estado debe ser "activo" o "inactivo".');

export const searchQuery = () =>
  query('search')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('La búsqueda no debe superar 120 caracteres.');

export const paginationQuery = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un entero mayor o igual a 1.').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100.')
    .toInt(),
];

// Rechaza campos que el cliente no puede enviar
export const forbiddenFields = (fields) =>
  fields.map((field) =>
    body(field).not().exists().withMessage(`El campo "${field}" no se puede enviar.`),
  );

// Monto con hasta 2 decimales; positive exige que sea mayor a cero (research R-10)
export const amountField = (field, { label = 'El monto', positive = false } = {}) => {
  const message = positive
    ? `${label} debe ser mayor a cero, con hasta 2 decimales.`
    : `${label} debe ser un monto no negativo con hasta 2 decimales.`;
  return body(field)
    .exists({ values: 'null' })
    .withMessage(message)
    .bail()
    .customSanitizer((value) => (typeof value === 'number' ? String(value) : value))
    .custom(
      (value) =>
        isValidAmount(value) && (!positive || toCents(value) > 0) && compareAmounts(value, MAX_AMOUNT) <= 0,
    )
    .withMessage(message)
    .bail()
    .customSanitizer((value) => fromCents(toCents(value)));
};

export const dateField = (field, label) =>
  body(field)
    .custom((value) => isValidDate(value))
    .withMessage(`${label} debe ser una fecha válida con formato AAAA-MM-DD.`);

export const dateQuery = (field, label) =>
  query(field)
    .optional({ values: 'falsy' })
    .custom((value) => isValidDate(value))
    .withMessage(`${label} debe ser una fecha válida con formato AAAA-MM-DD.`);

export const motivoField = () =>
  body('motivo')
    .isString()
    .withMessage('El motivo es obligatorio.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El motivo debe tener entre 1 y 255 caracteres.');

// "desde" no puede ser posterior a "hasta" y el rango no puede superar maxDays
export const dateRangeQuery = (maxDays = 366) =>
  query('hasta')
    .optional({ values: 'falsy' })
    .custom((hasta, { req }) => {
      const { desde } = req.query;
      if (!desde || !isValidDate(desde) || !isValidDate(hasta)) return true;
      if (desde > hasta) throw new Error('La fecha inicial no puede ser posterior a la final.');
      if (daysBetween(desde, hasta) > maxDays) {
        throw new Error(`El rango de fechas no puede superar ${maxDays} días.`);
      }
      return true;
    });
