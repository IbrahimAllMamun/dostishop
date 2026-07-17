import { z } from 'zod';

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const variantSchema = z.object({
  sku: z.string().nullish(),
  size: z.string().nullish(),
  color: z.string().nullish(),
  priceOverride: z.number().nonnegative().nullish(),
  stockQty: z.number().int().nonnegative().optional(),
});

// On update, a variant may carry an id (keep/update) or omit it (create new)
const variantUpdateSchema = variantSchema.extend({ id: z.string().optional() });

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

export const productUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  categoryId: z.string().optional(),
  basePrice: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(imageSchema).optional(),
  variants: z.array(variantUpdateSchema).optional(),
});
