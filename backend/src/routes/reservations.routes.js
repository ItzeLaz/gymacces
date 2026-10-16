import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';

// Montado en /reservations: reservar, cancelar y marcar asistencia (research R-04)
export const reservationsRouter = Router();

reservationsRouter.use(authenticate);
