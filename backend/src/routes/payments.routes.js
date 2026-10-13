import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/roles.js';
import { cancelPaymentRules, clientPaymentsRules, registerPaymentRules } from '../validators/payments.validator.js';

const frontDesk = authorize(ROLES.ADMIN, ROLES.RECEPTIONIST);

// Montado en /payments. No existe DELETE: los pagos solo se anulan (FR-019)
export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

paymentsRouter.post('/', frontDesk, registerPaymentRules, validate, paymentsController.create);
paymentsRouter.patch('/:id/cancel', authorize(ROLES.ADMIN), cancelPaymentRules, validate, paymentsController.cancel);

// Montado en /clients/:id/payments
export const clientPaymentsRouter = Router({ mergeParams: true });

clientPaymentsRouter.use(authenticate);

clientPaymentsRouter.get('/', frontDesk, clientPaymentsRules, validate, paymentsController.listByClient);
