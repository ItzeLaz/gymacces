import { Router } from 'express';
import * as classesController from '../controllers/classes.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import {
  classStatusRules,
  createClassRules,
  listClassesRules,
  updateClassRules,
} from '../validators/classes.validator.js';

// Montado en /classes: catálogo de clases, horario y detalle de sesiones (research R-04).
// Las rutas fijas (/instructors, /schedule) se declaran antes de /:id.
export const classesRouter = Router();

const adminOnly = authorize(ROLES.ADMIN);
const frontDesk = authorize(ROLES.ADMIN, ROLES.RECEPTIONIST);

classesRouter.use(authenticate);

classesRouter.get('/', frontDesk, listClassesRules, validate, classesController.list);
classesRouter.get('/instructors', adminOnly, classesController.instructors);
classesRouter.post('/', adminOnly, createClassRules, validate, classesController.create);
classesRouter.patch('/:id', adminOnly, updateClassRules, validate, classesController.update);
classesRouter.patch('/:id/status', adminOnly, classStatusRules, validate, classesController.deactivate);
