import { z } from 'zod';

export const checkoutSchema = z.object({
  customerName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  address: z.string().min(5),
  city: z.string().min(2),
  zone: z.enum(['inside_dhaka', 'outside_dhaka']),
  note: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['COD', 'BKASH', 'SSLCOMMERZ']).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, 'Cart is empty'),
});

export const checkoutIntentSchema = z.object({
  customerName: z.string().max(80).optional(),
  phone: z.string().min(6).max(20),
  items: z
    .array(
      z.object({
        name: z.string().max(200),
        qty: z.number().int().positive(),
        price: z.number().nonnegative(),
      }),
    )
    .min(1)
    .max(50),
  subtotal: z.number().nonnegative(),
});

export const subOrderStatusSchema = z
  .object({
    status: z
      .enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'])
      .optional(),
    paymentStatus: z.enum(['UNPAID', 'PAID', 'REFUNDED']).optional(),
    trackingNo: z.string().optional(),
  })
  .refine((v) => v.status || v.paymentStatus || v.trackingNo, {
    message: 'Provide at least one field to update',
  });
