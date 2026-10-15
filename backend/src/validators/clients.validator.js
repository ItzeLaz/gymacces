import { body } from 'express-validator';
import {
  emailField,
  forbiddenFields,
  idParam,
  paginationQuery,
  searchQuery,
  statusField,
  statusQuery,
} from './common.js';

// 10-15 dígitos; se permiten espacios, guiones y "+" inicial
const PHONE_PATTERN = /^\+?[\d\s-]+$/;

const textField = (field, label, max) =>
  body(field)
    .isString()
    .withMessage(`${label} es obligatorio.`)
    .bail()
    .trim()
    .isLength({ min: 1, max })
    .withMessage(`${label} debe tener entre 1 y ${max} caracteres.`);

const telefonoField = () =>
  body('telefono')
    .isString()
    .withMessage('El teléfono es obligatorio.')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('El teléfono es obligatorio.')
    .bail()
    .custom((value) => {
      const digits = value.replace(/\D/g, '');
      return PHONE_PATTERN.test(value) && digits.length >= 10 && digits.length <= 15;
    })
    .withMessage('El teléfono debe tener entre 10 y 15 dígitos; solo se permiten espacios, guiones y "+" al inicio.');

const direccionField = () =>
  body('direccion')
    .optional({ values: 'null' })
    .isString()
    .withMessage('La dirección no es válida.')
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La dirección no debe superar 200 caracteres.')
    .customSanitizer((value) => (value === '' ? null : value));

const NOT_EDITABLE = ['fecha_registro', 'estado', 'id_cliente', 'actualizado_en'];

export const createClientRules = [
  textField('nombre', 'El nombre', 80),
  textField('apellido', 'El apellido', 80),
  telefonoField(),
  emailField().optional({ values: 'falsy' }),
  direccionField(),
  ...forbiddenFields(NOT_EDITABLE),
];

export const updateClientRules = [
  idParam(),
  textField('nombre', 'El nombre', 80).optional(),
  textField('apellido', 'El apellido', 80).optional(),
  telefonoField().optional(),
  // null o "" eliminan el correo
  body('correo')
    .optional({ values: 'null' })
    .if((value) => value !== '')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('El correo no tiene un formato válido.')
    .isLength({ max: 120 })
    .withMessage('El correo no debe superar 120 caracteres.'),
  direccionField(),
  ...forbiddenFields(NOT_EDITABLE),
];

export const statusRules = [idParam(), statusField()];

export const getClientRules = [idParam()];

export const listClientsRules = [searchQuery(), statusQuery(), ...paginationQuery()];
