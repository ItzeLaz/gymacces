import { body } from 'express-validator';
import { FACE_MODEL_VERSION, isValidDescriptor } from '../utils/faceMatching.js';
import { idParam } from './common.js';

// Los mensajes nunca repiten los valores recibidos: son datos biométricos (FR-030)
export const registerFaceRules = [
  idParam(),
  body('consentimiento')
    .custom((value) => value === true)
    .withMessage('Confirma que el cliente dio su consentimiento.'),
  body('version_modelo')
    .custom((value) => value === FACE_MODEL_VERSION)
    .withMessage('La versión del modelo facial no es compatible. Recarga la página.'),
  body('muestras')
    .custom((value) => Array.isArray(value) && value.length === 3 && value.every(isValidDescriptor))
    .withMessage('Se necesitan 3 capturas faciales válidas.'),
];

export const faceStatusRules = [
  idParam(),
  body('estado').custom((value) => value === 'inactivo').withMessage('El estado solo puede cambiar a "inactivo".'),
];

export const getFaceRules = [idParam()];
