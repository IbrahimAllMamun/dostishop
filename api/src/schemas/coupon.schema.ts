import { z } from 'zod';

export const couponValidateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().nonnegative(),
});

export const couponCreateSchema = z.object({
  code: z.string().min(2),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  minOrder: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const couponUpdateSchema = z.object({
  type: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  value: z.number().positive().optional(),
  minOrder: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
