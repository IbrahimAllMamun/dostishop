import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';

// Public: active homepage banners
export const listBanners = asyncHandler(async (_req, res) => {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ banners });
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
