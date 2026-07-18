import { Router } from 'express';
import {
  registerVendor,
  login,
  logout,
  me,
  changePassword,
  adminResetPassword,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import {
  loginSchema,
  vendorRegisterSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
} from '../schemas/auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate(vendorRegisterSchema), registerVendor);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
authRouter.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
authRouter.post(
  '/admin/reset-password',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(adminResetPasswordSchema),
  adminResetPassword,
);
