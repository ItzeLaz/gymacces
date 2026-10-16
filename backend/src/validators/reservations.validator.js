import { body } from 'express-validator';
import { dateField, idParam } from './common.js';

// La coincidencia de la fecha con el día de la clase se valida en el servicio (FR-002)
export const createReservationRules = [
  body('id_clase').isInt({ min: 1 }).withMessage('La clase no es válida.').toInt(),
  dateField('fecha_sesion', 'La fecha de la sesión'),
  body('id_cliente').isInt({ min: 1 }).withMessage('El cliente no es válido.').toInt(),
];

export const reservationIdParam = [idParam()];
