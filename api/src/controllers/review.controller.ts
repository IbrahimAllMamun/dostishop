import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { Prisma, ReviewStatus } from '@prisma/client';

/** Recompute a product's denormalized rating from its APPROVED reviews. */
async function recomputeRating(tx: Prisma.TransactionClient, productId: string) {
  const agg = await tx.review.aggregate({
    where: { productId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: true,
  });
  await tx.product.update({
    where: { id: productId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
  });
}

// ---- Public ----

export const listProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const [reviews, distribution, product] = await Promise.all([
    prisma.review.findMany({
      where: { productId, status: 'APPROVED' },
      include: { photos: true },
      orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where: { productId, status: 'APPROVED' },
      _count: true,
    }),
    prisma.product.findUnique({
      where: { id: productId },
      select: { ratingAvg: true, ratingCount: true },
    }),
  ]);

  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of distribution) dist[d.rating] = d._count;

  res.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      rating: r.rating,
      comment: r.comment,
      isVerified: r.isVerified,
      createdAt: r.createdAt,
      photos: r.photos.map((p) => ({ url: p.url })),
    })),
    stats: {
      avg: Number(product?.ratingAvg ?? 0),
      count: product?.ratingCount ?? 0,
      distribution: dist,
    },
  });
});

export const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment, customerName, phone, orderNo, photos } = req.body as {
    productId: string;
    rating: number;
    comment?: string;
    customerName: string;
    phone: string;
    orderNo?: string;
    photos?: string[];
  };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError(404, 'Product not found');

  // One review per phone per product
  const dup = await prisma.review.findFirst({ where: { productId, phone } });
  if (dup) throw new ApiError(409, 'You have already reviewed this product');

  // Verified purchase: the order (matched by orderNo + phone) contains this product
  let isVerified = false;
  if (orderNo) {
    const order = await prisma.order.findFirst({
      where: { orderNo, phone },
      include: { subOrders: { include: { items: true } } },
    });
    if (order) {
      isVerified = order.subOrders.some(
        (s) => s.status !== 'CANCELLED' && s.items.some((i) => i.productId === productId),
      );
    }
  }

  const review = await prisma.review.create({
    data: {
      productId,
      customerName,
      phone,
      rating,
      comment: comment ?? null,
      orderNo: orderNo ?? null,
      isVerified,
      photos: photos?.length ? { create: photos.map((url) => ({ url })) } : undefined,
    },
  });

  res.status(201).json({
    message: 'Review submitted — it will appear after moderation.',
    reviewId: review.id,
    isVerified,
  });
});

// ---- Super admin ----

export const adminListReviews = asyncHandler(async (req, res) => {
  const status = req.query.status as ReviewStatus | undefined;
  const reviews = await prisma.review.findMany({
    where: status ? { status } : undefined,
    include: { photos: true, product: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ reviews });
});

export const adminUpdateReview = asyncHandler(async (req, res) => {
  const { status } = req.body as { status: ReviewStatus };
  const review = await prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({ where: { id: req.params.id }, data: { status } });
    await recomputeRating(tx, updated.productId);
    return updated;
  });
  res.json({ review });
});

export const adminDeleteReview = asyncHandler(async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.review.delete({ where: { id: req.params.id } });
    await recomputeRating(tx, deleted.productId);
  });
  res.json({ message: 'Review deleted' });
});
