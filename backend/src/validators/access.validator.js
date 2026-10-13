import { body } from 'express-validator';
import { isValidDescriptor } from '../utils/faceMatching.js';

// El mensaje nunca repite el descriptor recibido (FR-030)
export const accessAttemptRules = [
  body('descriptor')
    .custom((value) => value === null || isValidDescriptor(value))
    .withMessage('La captura facial no es válida.'),
];
