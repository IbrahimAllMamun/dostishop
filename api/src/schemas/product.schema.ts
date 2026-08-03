import { z } from 'zod';

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const variantSchema = z.object({
  sku: z.string().nullish(),
  // Free-text size/color remain accepted (CSV import still sends them). When
  // `attributeValueIds` is present it wins, and size/color are derived from it.
  size: z.string().nullish(),
  color: z.string().nullish(),
  /** AttributeValue ids that define this variant */
  attributeValueIds: z.array(z.string()).max(20).optional(),
  priceOverride: z.number().nonnegative().nullish(),
  stockQty: z.number().int().nonnegative().optional(),
});

// On update, a variant may carry an id (keep/update) or omit it (create new)
const variantUpdateSchema = variantSchema.extend({ id: z.string().optional() });

/**
 * Which attributes this product uses — variant axes and specs alike. Absent
 * leaves the selection untouched; [] clears it. The server derives nothing from
 * the variants here: an axis the vendor has chosen but not yet filled in is a
 * real state the form has to be able to save.
 */
const attributeIdsSchema = z.array(z.string()).max(20).optional();
/** Chosen values for the non-variant (spec) attributes above. */
const specValueIdsSchema = z.array(z.string()).max(100).optional();

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
  attributeIds: attributeIdsSchema,
  specValueIds: specValueIdsSchema,
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
  attributeIds: attributeIdsSchema,
  specValueIds: specValueIdsSchema,
});
