import { Router } from 'express';
import {
  checkout,
  trackOrder,
  listMySubOrders,
  updateSubOrderStatus,
  adminListOrders,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { checkoutSchema, subOrderStatusSchema } from '../schemas/order.schema';

export const orderRouter = Router();

// Public
orderRouter.post('/checkout', validate(checkoutSchema), checkout);
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
