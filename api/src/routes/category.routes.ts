import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { categoryCreateSchema, categoryUpdateSchema } from '../schemas/category.schema';

export const categoryRouter = Router();

categoryRouter.get('/', listCategories);
categoryRouter.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(categoryCreateSchema),
  createCategory,
);
categoryRouter.patch(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(categoryUpdateSchema),
  updateCategory,
);
categoryRouter.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteCategory);
