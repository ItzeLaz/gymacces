import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { loginRules } from '../validators/auth.validator.js';

export const authRouter = Router();

authRouter.post('/login', loginRules, validate, authController.login);
authRouter.get('/me', authenticate, authController.me);
