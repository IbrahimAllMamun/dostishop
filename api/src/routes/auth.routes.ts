import { Router } from 'express';
import { registerVendor, login, logout, me } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { loginSchema, vendorRegisterSchema } from '../schemas/auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate(vendorRegisterSchema), registerVendor);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
