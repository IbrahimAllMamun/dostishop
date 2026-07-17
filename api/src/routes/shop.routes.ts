import { Router } from 'express';
import {
  listShops,
  getShopBySlug,
  getMyShop,
  updateMyShop,
  adminListShops,
  updateShopStatus,
} from '../controllers/shop.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { shopUpdateSchema, shopStatusSchema } from '../schemas/shop.schema';

export const shopRouter = Router();

// Vendor (own shop) — declared before "/:slug" so they aren't swallowed by it
shopRouter.get('/me', authenticate, authorize('VENDOR'), getMyShop);
shopRouter.patch('/me', authenticate, authorize('VENDOR'), validate(shopUpdateSchema), updateMyShop);

// Super admin
shopRouter.get('/admin', authenticate, authorize('SUPER_ADMIN'), adminListShops);
shopRouter.patch(
  '/admin/:id/status',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(shopStatusSchema),
  updateShopStatus,
);

// Public
shopRouter.get('/', listShops);
shopRouter.get('/:slug', getShopBySlug);
