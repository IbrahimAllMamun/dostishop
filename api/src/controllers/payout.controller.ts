import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { round2 } from '../utils/helpers';

/** Bundle every DELIVERED, not-yet-settled sub-order into one payout per shop. */
export const generatePayouts = asyncHandler(async (_req, res) => {
  const eligible = await prisma.subOrder.findMany({
    where: { status: 'DELIVERED', payoutId: null },
    select: { id: true, shopId: true, subtotal: true, commissionAmount: true, vendorPayout: true, createdAt: true },
  });

  if (eligible.length === 0) {
    res.json({ message: 'No delivered sub-orders awaiting settlement', payouts: [] });
    return;
  }

  const byShop = new Map<string, typeof eligible>();
  for (const s of eligible) {
    const arr = byShop.get(s.shopId) ?? [];
    arr.push(s);
    byShop.set(s.shopId, arr);
  }

  const payouts = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const [shopId, subs] of byShop) {
      const payout = await tx.payout.create({
        data: {
          shopId,
          periodFrom: new Date(Math.min(...subs.map((s) => s.createdAt.getTime()))),
          periodTo: new Date(),
          gross: round2(subs.reduce((n, s) => n + Number(s.subtotal), 0)),
          commission: round2(subs.reduce((n, s) => n + Number(s.commissionAmount), 0)),
          net: round2(subs.reduce((n, s) => n + Number(s.vendorPayout), 0)),
        },
        include: { shop: { select: { name: true, slug: true } } },
      });
      await tx.subOrder.updateMany({
        where: { id: { in: subs.map((s) => s.id) } },
        data: { payoutId: payout.id },
      });
      created.push({ ...payout, subOrderCount: subs.length });
    }
    return created;
  });

  res.status(201).json({ message: `Created ${payouts.length} payout(s)`, payouts });
});

export const adminListPayouts = asyncHandler(async (_req, res) => {
  const payouts = await prisma.payout.findMany({
    include: {
      shop: { select: { name: true, slug: true } },
      _count: { select: { subOrders: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ payouts });
});

export const markPayoutPaid = asyncHandler(async (req, res) => {
  const payout = await prisma.payout.update({
    where: { id: req.params.id },
    data: { status: 'PAID' },
  });
  res.json({ payout });
});

export const vendorListPayouts = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: req.user!.sub } });
  if (!shop) throw new ApiError(404, 'Shop not found');

  const payouts = await prisma.payout.findMany({
    where: { shopId: shop.id },
    include: { _count: { select: { subOrders: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ payouts });
});
