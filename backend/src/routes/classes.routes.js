import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';

// Montado en /classes: catálogo de clases, horario y detalle de sesiones (research R-04).
// Las rutas fijas (/instructors, /schedule) se declaran antes de /:id.
export const classesRouter = Router();

classesRouter.use(authenticate);
