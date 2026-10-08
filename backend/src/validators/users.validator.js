import { body, query } from 'express-validator';
import { ALL_ROLES, ROLES } from '../utils/roles.js';
import {
  emailField,
  idParam,
  paginationQuery,
  passwordField,
  searchQuery,
  statusField,
  statusQuery,
} from './common.js';

const nombreField = () =>
  body('nombre')
    .isString()
    .withMessage('El nombre es obligatorio.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('El nombre debe tener entre 1 y 120 caracteres.');

const rolField = () =>
  body('rol').isIn(ALL_ROLES).withMessage(`El rol debe ser uno de: ${ALL_ROLES.join(', ')}.`);

const idClienteField = () =>
  body('id_cliente')
    .custom((value, { req }) => {
      const isClient = req.body.rol === ROLES.CLIENT;
      const present = value !== undefined && value !== null;
      if (isClient && !present) throw new Error('Para el rol cliente debes indicar el cliente vinculado.');
      if (!isClient && present && req.body.rol !== undefined) {
        throw new Error('Solo los usuarios con rol cliente pueden vincularse a un cliente.');
      }
      if (present && !(Number.isInteger(Number(value)) && Number(value) > 0)) {
        throw new Error('El identificador del cliente no es válido.');
      }
      return true;
    })
    .customSanitizer((value) => (value === undefined || value === null ? value : Number(value)));

// El correo es obligatorio salvo para el rol cliente, que lo toma del cliente vinculado
const correoForCreate = () => [
  body('correo')
    .if((value, { req }) => req.body.rol !== ROLES.CLIENT)
    .exists({ values: 'falsy' })
    .withMessage('El correo es obligatorio.'),
  emailField().optional(),
];

export const createUserRules = [
  nombreField(),
  ...correoForCreate(),
  passwordField(),
  rolField(),
  idClienteField(),
];

export const updateUserRules = [
  idParam(),
  nombreField().optional(),
  emailField().optional(),
  passwordField().optional(),
  rolField().optional(),
  // La coherencia entre rol e id_cliente se valida en el servicio con el rol final del usuario
  body('id_cliente')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('El identificador del cliente no es válido.')
    .toInt(),
];

export const statusRules = [idParam(), statusField()];

export const getUserRules = [idParam()];

export const listUsersRules = [
  searchQuery(),
  query('rol').optional().isIn(ALL_ROLES).withMessage('El rol del filtro no es válido.'),
  statusQuery(),
  ...paginationQuery(),
];
