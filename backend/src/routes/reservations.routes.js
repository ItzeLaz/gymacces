import { Router } from 'express';
import * as reservationsController from '../controllers/reservations.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import {
  attendanceRules,
  createReservationRules,
  reservationIdParam,
} from '../validators/reservations.validator.js';

// Montado en /reservations: reservar, cancelar y marcar asistencia (research R-04)
export const reservationsRouter = Router();

const frontDesk = authorize(ROLES.ADMIN, ROLES.RECEPTIONIST);

reservationsRouter.use(authenticate);

reservationsRouter.post('/', frontDesk, createReservationRules, validate, reservationsController.create);
reservationsRouter.patch('/:id/cancel', frontDesk, reservationIdParam, validate, reservationsController.cancel);
reservationsRouter.patch('/:id/attendance', frontDesk, attendanceRules, validate, reservationsController.attendance);
