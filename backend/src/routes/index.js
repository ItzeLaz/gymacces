import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { usersRouter } from './users.routes.js';
import { clientsRouter } from './clients.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.json({ data: { status: 'ok' } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/clients', clientsRouter);
