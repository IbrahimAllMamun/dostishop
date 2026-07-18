import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { round2 } from '../utils/helpers';

export const vendorAnalytics = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: req.user!.sub } });
  if (!shop) throw new ApiError(404, 'Shop not found');

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [totals, byStatus, recent, topItems] = await Promise.all([
    prisma.subOrder.aggregate({
      where: { shopId: shop.id, status: { not: 'CANCELLED' } },
      _sum: { subtotal: true, vendorPayout: true },
      _count: true,
    }),
    prisma.subOrder.groupBy({
      by: ['status'],
      where: { shopId: shop.id },
      _count: true,
    }),
    prisma.subOrder.findMany({
      where: { shopId: shop.id, status: { not: 'CANCELLED' }, createdAt: { gte: since } },
      select: { subtotal: true, createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { subOrder: { shopId: shop.id, status: { not: 'CANCELLED' } } },
      _sum: { lineTotal: true, quantity: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5,
    }),
  ]);

  // Daily revenue buckets for the last 30 days (fill gaps with 0)
  const buckets = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of recent) {
    const key = s.createdAt.toISOString().slice(0, 10);
    buckets.set(key, round2((buckets.get(key) ?? 0) + Number(s.subtotal)));
  }

  const revenue = Number(totals._sum.subtotal ?? 0);
  const orders = totals._count;

  res.json({
    summary: {
      revenue,
      payout: Number(totals._sum.vendorPayout ?? 0),
      orders,
      avgOrderValue: orders ? round2(revenue / orders) : 0,
    },
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    daily: [...buckets.entries()].map(([date, value]) => ({ date, revenue: value })),
    topProducts: topItems.map((t) => ({
      productId: t.productId,
      name: t.productName,
      revenue: Number(t._sum.lineTotal ?? 0),
      unitsSold: t._sum.quantity ?? 0,
    })),
  });
});
