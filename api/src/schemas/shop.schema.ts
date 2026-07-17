import { z } from 'zod';

export const shopUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export const shopStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']),
});
