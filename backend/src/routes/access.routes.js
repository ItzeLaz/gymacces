import { Router } from 'express';
import * as accessController from '../controllers/access.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import { accessAttemptRules } from '../validators/access.validator.js';

// Montado en /access. No hay rutas para modificar ni eliminar accesos (FR-039)
export const accessRouter = Router();

accessRouter.use(authenticate);

// La estación la abre un administrador o recepcionista con su sesión (FR-037)
accessRouter.post(
  '/attempts',
  authorize(ROLES.ADMIN, ROLES.RECEPTIONIST),
  accessAttemptRules,
  validate,
  accessController.registerAttempt,
);
