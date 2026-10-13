import { Router } from 'express';
import * as clientsController from '../controllers/clients.controller.js';
import * as accessController from '../controllers/access.controller.js';
import { ownAccessRules } from '../validators/access.validator.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import {
  createClientRules,
  getClientRules,
  listClientsRules,
  statusRules,
  updateClientRules,
} from '../validators/clients.validator.js';

export const clientsRouter = Router();

const canWrite = authorize(ROLES.ADMIN, ROLES.RECEPTIONIST);
const canRead = authorize(ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.TRAINER);

clientsRouter.use(authenticate);

// /me va antes de /:id para que no lo capture el parámetro
clientsRouter.get('/me', authorize(ROLES.CLIENT), clientsController.me);
clientsRouter.get('/me/access', authorize(ROLES.CLIENT), ownAccessRules, validate, accessController.listOwn);

clientsRouter.get('/', canRead, listClientsRules, validate, clientsController.list);
clientsRouter.get('/:id', canRead, getClientRules, validate, clientsController.getById);
clientsRouter.post('/', canWrite, createClientRules, validate, clientsController.create);
clientsRouter.patch('/:id', canWrite, updateClientRules, validate, clientsController.update);
clientsRouter.patch('/:id/status', canWrite, statusRules, validate, clientsController.changeStatus);
