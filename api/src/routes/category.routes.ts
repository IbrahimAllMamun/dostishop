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
// Vendors may add categories/subcategories too; admins keep full edit/delete rights
categoryRouter.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'VENDOR'),
  validate(categoryCreateSchema),
  createCategory,
);
// Vendors may edit/delete their own categories until an admin curates one;
// the ownership check itself lives in the controller (`assertCanMutate`).
categoryRouter.patch(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'VENDOR'),
  validate(categoryUpdateSchema),
  updateCategory,
);
categoryRouter.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'VENDOR'), deleteCategory);
