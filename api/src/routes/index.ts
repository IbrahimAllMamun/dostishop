import { Router } from 'express';
import { authRouter } from './auth.routes';
import { categoryRouter } from './category.routes';
import { attributeRouter } from './attribute.routes';
import { colorRouter } from './color.routes';
import { shopRouter } from './shop.routes';
import { productRouter } from './product.routes';
import { orderRouter } from './order.routes';
import {
  listBanners,
  getPublicSettings,
  adminListBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getAdminSettings,
  updateSettings,
} from '../controllers/content.controller';
import {
  generatePayouts,
  adminListPayouts,
  markPayoutPaid,
  vendorListPayouts,
} from '../controllers/payout.controller';
import { validate } from '../middleware/validate';
import {
  bannerCreateSchema,
  bannerUpdateSchema,
  settingsUpdateSchema,
} from '../schemas/content.schema';
import { uploadRouter } from './upload.routes';
import { couponRouter } from './coupon.routes';
import { reviewRouter } from './review.routes';
import { vendorAnalytics, adminAnalytics } from '../controllers/analytics.controller';
import { facebookFeed } from '../controllers/feed.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

export const router = Router();

router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/attributes', attributeRouter);
router.use('/colors', colorRouter);
router.use('/shops', shopRouter);
router.use('/products', productRouter);
router.use('/orders', orderRouter);
router.use('/uploads', uploadRouter);
router.use('/coupons', couponRouter);
router.use('/reviews', reviewRouter);
router.get('/analytics/vendor', authenticate, authorize('VENDOR'), vendorAnalytics);
router.get('/analytics/admin', authenticate, authorize('SUPER_ADMIN'), adminAnalytics);
router.get('/feed/facebook.csv', facebookFeed);
router.get('/banners', listBanners);
router.get('/settings', getPublicSettings);

// Super admin: content management
router.get('/banners/admin', authenticate, authorize('SUPER_ADMIN'), adminListBanners);
router.post('/banners', authenticate, authorize('SUPER_ADMIN'), validate(bannerCreateSchema), createBanner);
router.patch('/banners/:id', authenticate, authorize('SUPER_ADMIN'), validate(bannerUpdateSchema), updateBanner);
router.delete('/banners/:id', authenticate, authorize('SUPER_ADMIN'), deleteBanner);
router.get('/settings/admin', authenticate, authorize('SUPER_ADMIN'), getAdminSettings);
router.patch('/settings/admin', authenticate, authorize('SUPER_ADMIN'), validate(settingsUpdateSchema), updateSettings);

// Payout settlement
router.post('/payouts/admin/generate', authenticate, authorize('SUPER_ADMIN'), generatePayouts);
router.get('/payouts/admin', authenticate, authorize('SUPER_ADMIN'), adminListPayouts);
router.patch('/payouts/admin/:id/paid', authenticate, authorize('SUPER_ADMIN'), markPayoutPaid);
router.get('/payouts/mine', authenticate, authorize('VENDOR'), vendorListPayouts);
