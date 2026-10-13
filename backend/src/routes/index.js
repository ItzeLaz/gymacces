import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { usersRouter } from './users.routes.js';
import { clientsRouter } from './clients.routes.js';
import { membershipTypesRouter } from './membershipTypes.routes.js';
import { clientMembershipsRouter, membershipsRouter } from './memberships.routes.js';
import { clientPaymentsRouter, paymentsRouter } from './payments.routes.js';
import { facesRouter } from './faces.routes.js';
import { accessRouter } from './access.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.json({ data: { status: 'ok' } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/membership-types', membershipTypesRouter);
apiRouter.use('/memberships', membershipsRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/access', accessRouter);
// Las subrutas de un cliente van antes del router de clientes
apiRouter.use('/clients/:id/memberships', clientMembershipsRouter);
apiRouter.use('/clients/:id/payments', clientPaymentsRouter);
apiRouter.use('/clients/:id/face', facesRouter);
apiRouter.use('/clients', clientsRouter);
