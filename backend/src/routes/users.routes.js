import { Router } from 'express';
import * as usersController from '../controllers/users.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import {
  createUserRules,
  getUserRules,
  listUsersRules,
  statusRules,
  updateUserRules,
} from '../validators/users.validator.js';

// Gestión de usuarios: exclusiva del administrador (FR-010)
export const usersRouter = Router();

usersRouter.use(authenticate, authorize(ROLES.ADMIN));

usersRouter.get('/', listUsersRules, validate, usersController.list);
usersRouter.post('/', createUserRules, validate, usersController.create);
usersRouter.get('/:id', getUserRules, validate, usersController.getById);
usersRouter.patch('/:id', updateUserRules, validate, usersController.update);
usersRouter.patch('/:id/status', statusRules, validate, usersController.changeStatus);
