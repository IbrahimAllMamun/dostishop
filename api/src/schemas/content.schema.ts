import { z } from 'zod';

export const bannerCreateSchema = z.object({
  imageUrl: z.string().url(),
  linkUrl: z.string().optional(),
  title: z.string().max(120).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const bannerUpdateSchema = bannerCreateSchema.partial();

export const settingsUpdateSchema = z.object({
  storeName: z.string().min(1).optional(),
  shippingInsideDhaka: z.number().nonnegative().optional(),
  shippingOutsideDhaka: z.number().nonnegative().optional(),
  supportPhone: z.string().optional(),
  supportEmail: z.string().email().optional(),
});
