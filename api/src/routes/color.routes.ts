import { Router } from 'express';
import {
  listColors,
  createColor,
  updateColor,
  deleteColor,
} from '../controllers/color.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { colorCreateSchema, colorUpdateSchema } from '../schemas/color.schema';

export const colorRouter = Router();

// Public: the storefront paints swatches from this
colorRouter.get('/', listColors);

// Vendors may add and curate their own; ownership is enforced in the controller
colorRouter.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'VENDOR'),
  validate(colorCreateSchema),
  createColor,
);
colorRouter.patch(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'VENDOR'),
  validate(colorUpdateSchema),
  updateColor,
);
colorRouter.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'VENDOR'), deleteColor);
