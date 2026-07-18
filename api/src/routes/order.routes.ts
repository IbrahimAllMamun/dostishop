import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  checkout,
  trackOrder,
  captureCheckoutIntent,
  adminListAbandoned,
  adminUpdateAbandoned,
  listMySubOrders,
  updateSubOrderStatus,
  adminListOrders,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  checkoutSchema,
  checkoutIntentSchema,
  subOrderStatusSchema,
} from '../schemas/order.schema';

const intentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const orderRouter = Router();

// Public
orderRouter.post('/checkout', validate(checkoutSchema), checkout);
orderRouter.post('/checkout-intent', intentLimiter, validate(checkoutIntentSchema), captureCheckoutIntent);
orderRouter.get('/track', trackOrder);

// Vendor
orderRouter.get('/vendor/mine', authenticate, authorize('VENDOR'), listMySubOrders);
orderRouter.patch(
  '/vendor/suborders/:id',
  authenticate,
  authorize('VENDOR'),
  validate(subOrderStatusSchema),
  updateSubOrderStatus,
);

// Super admin
orderRouter.get('/admin/all', authenticate, authorize('SUPER_ADMIN'), adminListOrders);
orderRouter.get('/admin/abandoned', authenticate, authorize('SUPER_ADMIN'), adminListAbandoned);
orderRouter.patch('/admin/abandoned/:id', authenticate, authorize('SUPER_ADMIN'), adminUpdateAbandoned);
