import { Router } from 'express';
import { authRouter } from './auth.routes';
import { categoryRouter } from './category.routes';
import { shopRouter } from './shop.routes';
import { productRouter } from './product.routes';
import { orderRouter } from './order.routes';
import { listBanners, getPublicSettings } from '../controllers/content.controller';
import { uploadRouter } from './upload.routes';
import { couponRouter } from './coupon.routes';
import { reviewRouter } from './review.routes';
import { vendorAnalytics } from '../controllers/analytics.controller';
import { facebookFeed } from '../controllers/feed.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

export const router = Router();

router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/shops', shopRouter);
router.use('/products', productRouter);
router.use('/orders', orderRouter);
router.use('/uploads', uploadRouter);
router.use('/coupons', couponRouter);
router.use('/reviews', reviewRouter);
router.get('/analytics/vendor', authenticate, authorize('VENDOR'), vendorAnalytics);
router.get('/feed/facebook.csv', facebookFeed);
router.get('/banners', listBanners);
router.get('/settings', getPublicSettings);
