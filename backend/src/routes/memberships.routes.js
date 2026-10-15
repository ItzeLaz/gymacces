import { Router } from 'express';
import * as membershipsController from '../controllers/memberships.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import {
  assignMembershipRules,
  listClientMembershipsRules,
  membershipStatusRules,
} from '../validators/memberships.validator.js';

// Montado en /clients/:id/memberships
export const clientMembershipsRouter = Router({ mergeParams: true });

const frontDesk = authorize(ROLES.ADMIN, ROLES.RECEPTIONIST);
const staff = authorize(ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.TRAINER);

clientMembershipsRouter.use(authenticate);

clientMembershipsRouter.get('/', staff, listClientMembershipsRules, validate, membershipsController.listByClient);
clientMembershipsRouter.post('/', frontDesk, assignMembershipRules, validate, membershipsController.assign);
// La renovación usa las mismas reglas de entrada que la asignación
clientMembershipsRouter.post('/renew', frontDesk, assignMembershipRules, validate, membershipsController.renew);

// Montado en /memberships
export const membershipsRouter = Router();

membershipsRouter.use(authenticate);

membershipsRouter.patch(
  '/:id/status',
  authorize(ROLES.ADMIN),
  membershipStatusRules,
  validate,
  membershipsController.changeStatus,
);
