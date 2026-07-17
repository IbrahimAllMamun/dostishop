import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { assertCouponUsable, computeDiscount } from '../services/coupon.service';
import { Prisma } from '@prisma/client';

// ---- Public: validate a code against a subtotal ----
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body as { code: string; subtotal: number };
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  const usable = assertCouponUsable(coupon, Number(subtotal));
  const discount = computeDiscount(usable, Number(subtotal));
  res.json({ code: usable.code, type: usable.type, value: usable.value, discount });
});

// ---- Super admin CRUD ----
export const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ coupons });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const { code, type, value, minOrder, usageLimit, expiresAt, isActive } = req.body;
  const coupon = await prisma.coupon.create({
    data: {
      code: String(code).toUpperCase(),
      type,
      value,
      minOrder: minOrder ?? 0,
      usageLimit: usageLimit ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive ?? true,
    },
  });
  res.status(201).json({ coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { type, value, minOrder, usageLimit, expiresAt, isActive } = req.body;
  const data: Prisma.CouponUpdateInput = {};
  if (type !== undefined) data.type = type;
  if (value !== undefined) data.value = value;
  if (minOrder !== undefined) data.minOrder = minOrder;
  if (usageLimit !== undefined) data.usageLimit = usageLimit;
  if (isActive !== undefined) data.isActive = isActive;
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
  res.json({ coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.json({ message: 'Coupon deleted' });
});
