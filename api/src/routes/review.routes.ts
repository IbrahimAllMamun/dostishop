import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  listProductReviews,
  createReview,
  adminListReviews,
  adminUpdateReview,
  adminDeleteReview,
} from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { reviewCreateSchema, reviewStatusSchema } from '../schemas/review.schema';

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 review submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});

export const reviewRouter = Router();

// Public
reviewRouter.get('/product/:productId', listProductReviews);
reviewRouter.post('/', submitLimiter, validate(reviewCreateSchema), createReview);

// Super admin moderation
reviewRouter.get('/admin', authenticate, authorize('SUPER_ADMIN'), adminListReviews);
reviewRouter.patch(
  '/admin/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(reviewStatusSchema),
  adminUpdateReview,
);
reviewRouter.delete('/admin/:id', authenticate, authorize('SUPER_ADMIN'), adminDeleteReview);
