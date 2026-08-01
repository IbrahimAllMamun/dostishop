import { Request } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { round2 } from '../utils/helpers';
import { Prisma } from '@prisma/client';

/** Supported report windows, in days. */
const RANGES = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 } as const;
type RangeKey = keyof typeof RANGES;

/**
 * A "day" here is a Bangladesh day, not the server's day.
 *
 * Production runs on Render in UTC while development runs at UTC+6, so
 * server-local bucketing would put the day boundary in a different place in
 * each environment — and in neither case where a Dhaka seller expects it.
 * Asia/Dhaka is UTC+6 year-round with no DST, so the fixed offset is safe.
 */
const BIZ_OFFSET = '+06:00';
const DAY_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD for an instant, in the marketplace's timezone. */
function dayKey(d: Date): string {
  const p = Object.fromEntries(DAY_PARTS.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Shift a YYYY-MM-DD key by n days. Pure date arithmetic, no timezone. */
function shiftKey(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The instant at which a given Dhaka day begins. */
function startOfDay(key: string): Date {
  return new Date(`${key}T00:00:00${BIZ_OFFSET}`);
}

function resolveRange(req: Request) {
  const raw = req.query.range as string | undefined;
  const key: RangeKey = raw && raw in RANGES ? (raw as RangeKey) : '30d';
  const days = RANGES[key];

  // Anchored on today's Dhaka date so the last bucket is always today
  const firstKey = shiftKey(dayKey(new Date()), -(days - 1));
  const from = startOfDay(firstKey);

  // The equally long window immediately before `from`, for trend deltas
  const previousFrom = startOfDay(shiftKey(firstKey, -days));

  return { key, days, from, previousFrom, firstKey };
}

/** Percentage change. `null` means there is no basis to compare against. */
function trend(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return round2(((current - previous) / previous) * 100);
}

/** Zero-filled daily buckets so a chart never has gaps in its x-axis. */
function dailyBuckets(firstKey: string, days: number) {
  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    buckets.set(shiftKey(firstKey, i), { revenue: 0, orders: 0 });
  }
  return buckets;
}

// Cancelled sub-orders are excluded from every money figure on purpose: they
// represent revenue that never existed.
const EARNED: Prisma.SubOrderWhereInput = { status: { not: 'CANCELLED' } };

export const vendorAnalytics = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: req.user!.sub } });
  if (!shop) throw new ApiError(404, 'Shop not found');

  const { key, days, from, previousFrom, firstKey } = resolveRange(req);
  const scope = { shopId: shop.id, ...EARNED };

  const [totals, previous, byStatus, recent, topItems] = await Promise.all([
    prisma.subOrder.aggregate({
      where: { ...scope, createdAt: { gte: from } },
      _sum: { subtotal: true, vendorPayout: true },
      _count: true,
    }),
    prisma.subOrder.aggregate({
      where: { ...scope, createdAt: { gte: previousFrom, lt: from } },
      _sum: { subtotal: true, vendorPayout: true },
      _count: true,
    }),
    prisma.subOrder.groupBy({ by: ['status'], where: { shopId: shop.id }, _count: true }),
    prisma.subOrder.findMany({
      where: { ...scope, createdAt: { gte: from } },
      select: { subtotal: true, createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { subOrder: { ...scope, createdAt: { gte: from } } },
      _sum: { lineTotal: true, quantity: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5,
    }),
  ]);

  const buckets = dailyBuckets(firstKey, days);
  for (const s of recent) {
    const b = buckets.get(dayKey(s.createdAt));
    if (b) {
      b.revenue = round2(b.revenue + Number(s.subtotal));
      b.orders += 1;
    }
  }

  const revenue = Number(totals._sum.subtotal ?? 0);
  const payout = Number(totals._sum.vendorPayout ?? 0);
  const orders = totals._count;

  res.json({
    range: key,
    summary: {
      revenue,
      payout,
      orders,
      avgOrderValue: orders ? round2(revenue / orders) : 0,
      trend: {
        revenue: trend(revenue, Number(previous._sum.subtotal ?? 0)),
        orders: trend(orders, previous._count),
        payout: trend(payout, Number(previous._sum.vendorPayout ?? 0)),
      },
    },
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    daily: [...buckets.entries()].map(([date, v]) => ({ date, ...v })),
    topProducts: topItems.map((t) => ({
      productId: t.productId,
      name: t.productName,
      revenue: Number(t._sum.lineTotal ?? 0),
      unitsSold: t._sum.quantity ?? 0,
    })),
  });
});

export const adminAnalytics = asyncHandler(async (req, res) => {
  const { key, days, from, previousFrom, firstKey } = resolveRange(req);

  const [totals, previous, recent, topItems, byShop, shopCounts, orderRows, itemRows] =
    await Promise.all([
      prisma.subOrder.aggregate({
        where: { ...EARNED, createdAt: { gte: from } },
        _sum: { subtotal: true, commissionAmount: true, shippingCost: true },
        _count: true,
      }),
      prisma.subOrder.aggregate({
        where: { ...EARNED, createdAt: { gte: previousFrom, lt: from } },
        _sum: { subtotal: true, commissionAmount: true },
        _count: true,
      }),
      prisma.subOrder.findMany({
        where: { ...EARNED, createdAt: { gte: from } },
        select: { subtotal: true, createdAt: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { subOrder: { ...EARNED, createdAt: { gte: from } } },
        _sum: { lineTotal: true, quantity: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 6,
      }),
      prisma.subOrder.groupBy({
        by: ['shopId'],
        where: { ...EARNED, createdAt: { gte: from } },
        _sum: { subtotal: true },
        _count: true,
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 6,
      }),
      prisma.shop.groupBy({ by: ['status'], _count: true }),
      // Customers have no accounts here, so "a customer" is a distinct phone
      prisma.order.findMany({
        where: { createdAt: { gte: from } },
        select: { phone: true, grandTotal: true, customerName: true },
      }),
      // OrderItem stores productId as a plain column with no relation, so that
      // order history survives a product being deleted. Category is therefore
      // resolved in a second pass below rather than joined here.
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { subOrder: { ...EARNED, createdAt: { gte: from } } },
        _sum: { lineTotal: true },
      }),
    ]);

  const buckets = dailyBuckets(firstKey, days);
  for (const s of recent) {
    const b = buckets.get(dayKey(s.createdAt));
    if (b) {
      b.revenue = round2(b.revenue + Number(s.subtotal));
      b.orders += 1;
    }
  }

  // Reflects each product's category *now*. A product that has since been
  // deleted, or had its category cleared, falls into "Uncategorised" —
  // historically accurate categorisation would need a snapshot on OrderItem.
  const soldProducts = await prisma.product.findMany({
    where: { id: { in: itemRows.map((r) => r.productId) } },
    select: { id: true, category: { select: { name: true } } },
  });
  const categoryOf = new Map(soldProducts.map((p) => [p.id, p.category?.name ?? 'Uncategorised']));

  const categoryTotals = new Map<string, number>();
  for (const row of itemRows) {
    const name = categoryOf.get(row.productId) ?? 'Uncategorised';
    categoryTotals.set(name, round2((categoryTotals.get(name) ?? 0) + Number(row._sum.lineTotal ?? 0)));
  }

  const shops = await prisma.shop.findMany({
    where: { id: { in: byShop.map((s) => s.shopId) } },
    select: { id: true, name: true, slug: true },
  });
  const shopById = new Map(shops.map((s) => [s.id, s]));

  const byPhone = new Map<string, { name: string; orders: number; spent: number }>();
  for (const o of orderRows) {
    const entry = byPhone.get(o.phone) ?? { name: o.customerName, orders: 0, spent: 0 };
    entry.orders += 1;
    entry.spent = round2(entry.spent + Number(o.grandTotal));
    byPhone.set(o.phone, entry);
  }

  const revenue = Number(totals._sum.subtotal ?? 0);
  const commission = Number(totals._sum.commissionAmount ?? 0);
  const orders = totals._count;

  res.json({
    range: key,
    summary: {
      revenue,
      commission,
      orders,
      avgOrderValue: orders ? round2(revenue / orders) : 0,
      customers: byPhone.size,
      trend: {
        revenue: trend(revenue, Number(previous._sum.subtotal ?? 0)),
        commission: trend(commission, Number(previous._sum.commissionAmount ?? 0)),
        orders: trend(orders, previous._count),
      },
    },
    shops: Object.fromEntries(shopCounts.map((s) => [s.status, s._count])),
    daily: [...buckets.entries()].map(([date, v]) => ({ date, ...v })),
    byCategory: [...categoryTotals.entries()]
      .map(([name, value]) => ({ name, revenue: value }))
      .sort((a, b) => b.revenue - a.revenue),
    topProducts: topItems.map((t) => ({
      productId: t.productId,
      name: t.productName,
      revenue: Number(t._sum.lineTotal ?? 0),
      unitsSold: t._sum.quantity ?? 0,
    })),
    topShops: byShop.map((s) => ({
      shopId: s.shopId,
      name: shopById.get(s.shopId)?.name ?? 'Unknown',
      slug: shopById.get(s.shopId)?.slug,
      revenue: Number(s._sum.subtotal ?? 0),
      orders: s._count,
    })),
    topCustomers: [...byPhone.entries()]
      .map(([phone, v]) => ({ phone, ...v }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 6),
  });
});
