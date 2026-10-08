import { body, param, query } from 'express-validator';

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
