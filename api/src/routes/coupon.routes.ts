import { Router } from 'express';
import {
  validateCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/coupon.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  couponValidateSchema,
  couponCreateSchema,
  couponUpdateSchema,
} from '../schemas/coupon.schema';

export const couponRouter = Router();

// Public
couponRouter.post('/validate', validate(couponValidateSchema), validateCoupon);

// Super admin
couponRouter.get('/', authenticate, authorize('SUPER_ADMIN'), listCoupons);
couponRouter.post('/', authenticate, authorize('SUPER_ADMIN'), validate(couponCreateSchema), createCoupon);
couponRouter.patch(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(couponUpdateSchema),
  updateCoupon,
);
couponRouter.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteCoupon);
