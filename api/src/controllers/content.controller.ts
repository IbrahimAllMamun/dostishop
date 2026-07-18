import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

// Public: active homepage banners
export const listBanners = asyncHandler(async (_req, res) => {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ banners });
});

// ---- Super admin: banner management ----

export const adminListBanners = asyncHandler(async (_req, res) => {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ banners });
});

export const createBanner = asyncHandler(async (req, res) => {
  const { imageUrl, linkUrl, title, sortOrder, isActive } = req.body;
  const banner = await prisma.banner.create({
    data: {
      imageUrl,
      linkUrl: linkUrl ?? null,
      title: title ?? null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
    },
  });
  res.status(201).json({ banner });
});

export const updateBanner = asyncHandler(async (req, res) => {
  const { imageUrl, linkUrl, title, sortOrder, isActive } = req.body;
  const data: Prisma.BannerUpdateInput = {};
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (linkUrl !== undefined) data.linkUrl = linkUrl;
  if (title !== undefined) data.title = title;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (isActive !== undefined) data.isActive = isActive;
  const banner = await prisma.banner.update({ where: { id: req.params.id }, data });
  res.json({ banner });
});

export const deleteBanner = asyncHandler(async (req, res) => {
  await prisma.banner.delete({ where: { id: req.params.id } });
  res.json({ message: 'Banner deleted' });
});

// ---- Super admin: settings ----

export const getAdminSettings = asyncHandler(async (_req, res) => {
  const settings = await prisma.setting.findFirst();
  res.json({ settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const { storeName, shippingInsideDhaka, shippingOutsideDhaka, supportPhone, supportEmail } =
    req.body;
  const existing = await prisma.setting.findFirst();
  const data = {
    ...(storeName !== undefined ? { storeName } : {}),
    ...(shippingInsideDhaka !== undefined ? { shippingInsideDhaka } : {}),
    ...(shippingOutsideDhaka !== undefined ? { shippingOutsideDhaka } : {}),
    ...(supportPhone !== undefined ? { supportPhone } : {}),
    ...(supportEmail !== undefined ? { supportEmail } : {}),
  };
  const settings = existing
    ? await prisma.setting.update({ where: { id: existing.id }, data })
    : await prisma.setting.create({ data: { storeName: storeName ?? 'Marketplace', ...data } });
  res.json({ settings });
});

// Public: store settings the storefront needs (shipping rates, support info)
export const getPublicSettings = asyncHandler(async (_req, res) => {
  const s = await prisma.setting.findFirst();
  res.json({
    settings: s
      ? {
          storeName: s.storeName,
          shippingInsideDhaka: s.shippingInsideDhaka,
          shippingOutsideDhaka: s.shippingOutsideDhaka,
          supportPhone: s.supportPhone,
          supportEmail: s.supportEmail,
        }
      : null,
  });
});
