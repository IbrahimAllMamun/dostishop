import { z } from 'zod';

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const variantSchema = z.object({
  sku: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  priceOverride: z.number().nonnegative().optional(),
  stockQty: z.number().int().nonnegative().optional(),
});

export const productCreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  brand: z.string().optional(),
  categoryId: z.string().optional(),
  basePrice: z.number().positive(),
  salePrice: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(imageSchema).optional(),
  variants: z.array(variantSchema).optional(),
});

export const productUpdateSchema = productCreateSchema
  .omit({ images: true, variants: true })
  .partial();
