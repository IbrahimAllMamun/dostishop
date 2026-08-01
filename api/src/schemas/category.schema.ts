import { z } from 'zod';

export const categoryCreateSchema = z.object({
  name: z.string().min(2),
  // null/absent = top-level; on update, explicit null promotes a sub to top-level
  parentId: z.string().nullish(),
  imageUrl: z.string().url().nullish(),
  /** Lucide icon name, e.g. "ShoppingBag" */
  icon: z.string().max(40).nullish(),
  sortOrder: z.number().int().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();
