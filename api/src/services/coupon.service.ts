import { Coupon } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { round2 } from '../utils/helpers';

/** Throws if the coupon can't be used for this subtotal; returns it otherwise. */
export function assertCouponUsable(coupon: Coupon | null, subtotal: number): Coupon {
  if (!coupon || !coupon.isActive) throw new ApiError(404, 'Invalid coupon code');
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, 'This coupon has expired');
  }
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    throw new ApiError(400, 'This coupon has reached its usage limit');
  }
  if (subtotal < Number(coupon.minOrder)) {
    throw new ApiError(400, `Minimum order for this coupon is ৳${Number(coupon.minOrder)}`);
  }
  return coupon;
}

/** Discount amount for a usable coupon, capped at the subtotal. */
export function computeDiscount(coupon: Coupon, subtotal: number): number {
  const raw =
    coupon.type === 'PERCENTAGE' ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  return round2(Math.min(raw, subtotal));
}
