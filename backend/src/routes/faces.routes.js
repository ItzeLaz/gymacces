import { Router } from 'express';
import * as facesController from '../controllers/faces.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import { faceStatusRules, getFaceRules, registerFaceRules } from '../validators/faces.validator.js';

// Montado en /clients/:id/face; solo administrador y recepcionista (FR-025)
export const facesRouter = Router({ mergeParams: true });

facesRouter.use(authenticate, authorize(ROLES.ADMIN, ROLES.RECEPTIONIST));

facesRouter.get('/', getFaceRules, validate, facesController.getStatus);
facesRouter.put('/', registerFaceRules, validate, facesController.register);
facesRouter.patch('/status', faceStatusRules, validate, facesController.changeStatus);
