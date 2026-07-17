import { Router } from 'express';
import { authRouter } from './auth.routes';
import { categoryRouter } from './category.routes';
import { shopRouter } from './shop.routes';
import { productRouter } from './product.routes';
import { orderRouter } from './order.routes';

export const router = Router();

router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/shops', shopRouter);
router.use('/products', productRouter);
router.use('/orders', orderRouter);
