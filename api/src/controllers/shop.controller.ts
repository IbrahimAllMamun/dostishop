import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { ShopStatus } from '@prisma/client';

// ---- Public ----

export const listShops = asyncHandler(async (_req, res) => {
  const shops = await prisma.shop.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true, logoUrl: true, bannerUrl: true, description: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ shops });
});

export const getShopBySlug = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findFirst({
    where: { slug: req.params.slug, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      bannerUrl: true,
      description: true,
      phone: true,
    },
  });
  if (!shop) throw new ApiError(404, 'Shop not found');
  res.json({ shop });
});

// ---- Vendor (own shop) ----

export const getMyShop = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: req.user!.sub } });
  if (!shop) throw new ApiError(404, 'Shop not found');
  res.json({ shop });
});

export const updateMyShop = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: req.user!.sub } });
  if (!shop) throw new ApiError(404, 'Shop not found');

  const { name, description, phone, address, logoUrl, bannerUrl } = req.body;
  const updated = await prisma.shop.update({
    where: { id: shop.id },
    data: { name, description, phone, address, logoUrl, bannerUrl },
  });
  res.json({ shop: updated });
});

// ---- Super admin ----

export const adminListShops = asyncHandler(async (req, res) => {
  const status = req.query.status as ShopStatus | undefined;
  const shops = await prisma.shop.findMany({
    where: status ? { status } : undefined,
    include: { owner: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ shops });
});

export const updateShopStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const shop = await prisma.shop.update({ where: { id: req.params.id }, data: { status } });
  res.json({ shop });
});
