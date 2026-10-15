import { Router } from 'express';
import * as typesController from '../controllers/membershipTypes.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import {
  createTypeRules,
  listTypesRules,
  typeStatusRules,
  updateTypeRules,
} from '../validators/membershipTypes.validator.js';

export const membershipTypesRouter = Router();

const adminOnly = authorize(ROLES.ADMIN);
const canRead = authorize(ROLES.ADMIN, ROLES.RECEPTIONIST);

membershipTypesRouter.use(authenticate);

membershipTypesRouter.get('/', canRead, listTypesRules, validate, typesController.list);
membershipTypesRouter.post('/', adminOnly, createTypeRules, validate, typesController.create);
membershipTypesRouter.patch('/:id', adminOnly, updateTypeRules, validate, typesController.update);
membershipTypesRouter.patch('/:id/status', adminOnly, typeStatusRules, validate, typesController.changeStatus);
