import { body } from 'express-validator';

// Solo se exige que los campos existan: no se revela la política de contraseñas
export const loginRules = [
  body('correo')
    .isString()
    .withMessage('El correo es obligatorio.')
    .bail()
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('El correo es obligatorio.'),
  body('password')
    .isString()
    .withMessage('La contraseña es obligatoria.')
    .bail()
    .notEmpty()
    .withMessage('La contraseña es obligatoria.'),
];
