import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

/**
 * The shop's media library.
 *
 * Every query is scoped to the caller's own shop — the same isolation boundary
 * the rest of the vendor API enforces. An admin has no shop, so they see the
 * platform's own assets (`shopId` null) rather than a union of everyone's.
 */

/** The shop this caller's library belongs to; null for the platform admin. */
async function libraryScope(req: Request): Promise<string | null> {
  if (req.user?.role === 'SUPER_ADMIN') return null;
  const shop = await prisma.shop.findUnique({
    where: { ownerId: req.user!.sub },
    select: { id: true },
  });
  if (!shop) throw new ApiError(404, 'No shop found for this account');
  return shop.id;
}

/**
 * How many product images point at each URL. `ProductImage` stores a plain URL
 * with no relation to `MediaAsset` — the file is the shared thing, not a row —
 * so usage is counted by matching URLs within the shop.
 */
async function usageByUrl(shopId: string | null, urls: string[]): Promise<Map<string, number>> {
  if (!urls.length) return new Map();
  const rows = await prisma.productImage.groupBy({
    by: ['url'],
    where: {
      url: { in: urls },
      ...(shopId ? { product: { shopId } } : {}),
    },
    _count: { url: true },
  });
  return new Map(rows.map((r) => [r.url, r._count.url]));
}

export const listMedia = asyncHandler(async (req, res) => {
  const shopId = await libraryScope(req);
  const { folderId, q, sort, usage } = req.query as Record<string, string | undefined>;

  const where: Prisma.MediaAssetWhereInput = { shopId };
  // `folderId=none` is the unfiled bucket; absent means "everything"
  if (folderId === 'none') where.folderId = null;
  else if (folderId) where.folderId = folderId;
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const orderBy: Prisma.MediaAssetOrderByWithRelationInput =
    sort === 'name'
      ? { name: 'asc' }
      : sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'largest'
          ? { sizeBytes: 'desc' }
          : { createdAt: 'desc' };

  const [assets, folders] = await Promise.all([
    prisma.mediaAsset.findMany({ where, orderBy, take: 500 }),
    prisma.mediaFolder.findMany({
      where: { shopId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { assets: true } } },
    }),
  ]);

  const used = await usageByUrl(shopId, assets.map((a) => a.url));
  const withUsage = assets.map((a) => ({ ...a, usedBy: used.get(a.url) ?? 0 }));

  // Filtering on usage happens here rather than in SQL: it is derived from a
  // different table by URL, and a library is at most a few hundred rows.
  const filtered =
    usage === 'used'
      ? withUsage.filter((a) => a.usedBy > 0)
      : usage === 'unused'
        ? withUsage.filter((a) => a.usedBy === 0)
        : withUsage;

  res.json({ assets: filtered, folders });
});

export const createFolder = asyncHandler(async (req, res) => {
  const shopId = await libraryScope(req);
  const name = (req.body.name as string).trim();

  const clash = await prisma.mediaFolder.findFirst({ where: { shopId, name } });
  if (clash) throw new ApiError(409, `A folder called "${name}" already exists`);

  const folder = await prisma.mediaFolder.create({ data: { shopId, name } });
  res.status(201).json({ folder });
});

export const updateFolder = asyncHandler(async (req, res) => {
  const shopId = await libraryScope(req);
  const existing = await prisma.mediaFolder.findFirst({ where: { id: req.params.id, shopId } });
  if (!existing) throw new ApiError(404, 'Folder not found');

  const name = (req.body.name as string).trim();
  const clash = await prisma.mediaFolder.findFirst({
    where: { shopId, name, NOT: { id: existing.id } },
  });
  if (clash) throw new ApiError(409, `A folder called "${name}" already exists`);

  const folder = await prisma.mediaFolder.update({ where: { id: existing.id }, data: { name } });
  res.json({ folder });
});

export const deleteFolder = asyncHandler(async (req, res) => {
  const shopId = await libraryScope(req);
  const existing = await prisma.mediaFolder.findFirst({ where: { id: req.params.id, shopId } });
  if (!existing) throw new ApiError(404, 'Folder not found');

  // The FK is ON DELETE SET NULL, so the images survive as unfiled rather than
  // disappearing with the folder.
  await prisma.mediaFolder.delete({ where: { id: existing.id } });
  res.json({ message: 'Folder deleted' });
});

export const updateAsset = asyncHandler(async (req, res) => {
  const shopId = await libraryScope(req);
  const existing = await prisma.mediaAsset.findFirst({ where: { id: req.params.id, shopId } });
  if (!existing) throw new ApiError(404, 'Image not found');

  const { name, folderId } = req.body as { name?: string; folderId?: string | null };
  const data: Prisma.MediaAssetUpdateInput = {};
  if (name !== undefined) data.name = name.trim();

  if (folderId !== undefined) {
    if (folderId === null || folderId === '') {
      data.folder = { disconnect: true };
    } else {
      // A folder from another shop would silently move the asset out of view
      const folder = await prisma.mediaFolder.findFirst({ where: { id: folderId, shopId } });
      if (!folder) throw new ApiError(400, 'That folder does not exist');
      data.folder = { connect: { id: folder.id } };
    }
  }

  const asset = await prisma.mediaAsset.update({ where: { id: existing.id }, data });
  res.json({ asset });
});

export const deleteAsset = asyncHandler(async (req, res) => {
  const shopId = await libraryScope(req);
  const existing = await prisma.mediaAsset.findFirst({ where: { id: req.params.id, shopId } });
  if (!existing) throw new ApiError(404, 'Image not found');

  // Removing the row would not remove the file, but it would strand it: the
  // product still renders the URL while the vendor can no longer find it.
  const used = await usageByUrl(shopId, [existing.url]);
  const count = used.get(existing.url) ?? 0;
  if (count > 0) {
    throw new ApiError(
      400,
      `Still used by ${count} product image${count === 1 ? '' : 's'}, so it cannot be removed from the library`,
    );
  }

  await prisma.mediaAsset.delete({ where: { id: existing.id } });
  res.json({ message: 'Image removed from the library' });
});

/**
 * Record an uploaded file in the library. Called by the upload route so that
 * everything a vendor uploads is findable later, whether it came from the
 * gallery or from the product form.
 */
export async function recordAsset(params: {
  shopId: string | null;
  url: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
}) {
  const { shopId, url, name, mimeType, sizeBytes } = params;
  // Not an upsert: the unique pair includes a nullable `shopId`, and Postgres
  // does not treat two nulls as equal, so an admin upload would never match an
  // existing row and would conflict on insert instead.
  const existing = await prisma.mediaAsset.findFirst({ where: { shopId, url } });
  if (existing) return existing;
  return prisma.mediaAsset.create({ data: { shopId, url, name, mimeType, sizeBytes } });
}
