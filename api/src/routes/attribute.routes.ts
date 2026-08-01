import { Router } from 'express';
import {
  listAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from '../controllers/attribute.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { attributeCreateSchema, attributeUpdateSchema } from '../schemas/attribute.schema';

export const attributeRouter = Router();

// Public: the storefront needs the value set to render filters
attributeRouter.get('/', listAttributes);

// Vendors may add and curate their own; the ownership check lives in the
// controller (`assertCanMutate`), mirroring categories.
attributeRouter.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'VENDOR'),
  validate(attributeCreateSchema),
  createAttribute,
);
attributeRouter.patch(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'VENDOR'),
  validate(attributeUpdateSchema),
  updateAttribute,
);
attributeRouter.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'VENDOR'), deleteAttribute);
