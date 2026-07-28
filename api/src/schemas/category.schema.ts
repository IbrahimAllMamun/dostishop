import { z } from 'zod';

export const categoryCreateSchema = z.object({
  name: z.string().min(2),
  // null/absent = top-level; on update, explicit null promotes a sub to top-level
  parentId: z.string().nullish(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();
