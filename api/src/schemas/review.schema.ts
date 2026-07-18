import { z } from 'zod';

export const reviewCreateSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  customerName: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
  orderNo: z.string().max(40).optional(),
  photos: z.array(z.string().url()).max(3).optional(),
});

export const reviewStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});
