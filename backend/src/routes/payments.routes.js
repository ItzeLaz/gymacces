import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import {
  cancelPaymentRules,
  clientPaymentsRules,
  listDebtsRules,
  listPaymentsRules,
  registerPaymentRules,
} from '../validators/payments.validator.js';

const frontDesk = authorize(ROLES.ADMIN, ROLES.RECEPTIONIST);
const adminOnly = authorize(ROLES.ADMIN);

// Montado en /payments. No existe DELETE: los pagos solo se anulan (FR-019)
export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

paymentsRouter.get('/', adminOnly, listPaymentsRules, validate, paymentsController.list);
paymentsRouter.post('/', frontDesk, registerPaymentRules, validate, paymentsController.create);
paymentsRouter.patch('/:id/cancel', adminOnly, cancelPaymentRules, validate, paymentsController.cancel);

// Montado en /clients/:id/payments
export const clientPaymentsRouter = Router({ mergeParams: true });

clientPaymentsRouter.use(authenticate);

clientPaymentsRouter.get('/', frontDesk, clientPaymentsRules, validate, paymentsController.listByClient);

// Montado en /debts; solo administrador (FR-021)
export const debtsRouter = Router();

debtsRouter.use(authenticate);

debtsRouter.get('/', adminOnly, listDebtsRules, validate, paymentsController.listDebts);
