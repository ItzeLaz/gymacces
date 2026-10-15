import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import { dashboardRules } from '../validators/dashboard.validator.js';

// Montado en /dashboard; solo el administrador (FR-001)
export const dashboardRouter = Router();

dashboardRouter.use(authenticate, authorize(ROLES.ADMIN));

dashboardRouter.get('/', dashboardRules, validate, dashboardController.get);
