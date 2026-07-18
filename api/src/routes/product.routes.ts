import { Router } from 'express';
import {
  listProducts,
  getProductBySlug,
  getFacets,
  suggestProducts,
  listMyProducts,
  getMyProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller';
import { exportMyProducts, importMyProducts } from '../controllers/product-csv.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { productCreateSchema, productUpdateSchema } from '../schemas/product.schema';

export const productRouter = Router();

// Vendor
productRouter.get('/mine', authenticate, authorize('VENDOR'), listMyProducts);
productRouter.get('/mine/export', authenticate, authorize('VENDOR'), exportMyProducts);
productRouter.post('/mine/import', authenticate, authorize('VENDOR'), importMyProducts);
productRouter.get('/mine/:id', authenticate, authorize('VENDOR'), getMyProduct);
productRouter.post('/', authenticate, authorize('VENDOR'), validate(productCreateSchema), createProduct);
productRouter.patch(
  '/:id',
  authenticate,
  authorize('VENDOR'),
  validate(productUpdateSchema),
  updateProduct,
);
productRouter.delete('/:id', authenticate, authorize('VENDOR'), deleteProduct);

// Public
productRouter.get('/', listProducts);
productRouter.get('/facets', getFacets);
productRouter.get('/suggest', suggestProducts);
productRouter.get('/slug/:slug', getProductBySlug);
