import { z } from 'zod';

export const folderCreateSchema = z.object({
  name: z.string().min(1).max(60),
});

export const folderUpdateSchema = folderCreateSchema;

export const assetUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  /** `null` moves the asset back to unfiled; omitted leaves it where it is. */
  folderId: z.string().nullish(),
});
