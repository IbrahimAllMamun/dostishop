import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { generateOrderNo, round2 } from '../utils/helpers';
import { Prisma } from '@prisma/client';

interface CheckoutItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

type ProductWithRels = Prisma.ProductGetPayload<{ include: { variants: true; shop: true } }>;
type VariantOf = ProductWithRels['variants'][number];

interface Line {
  product: ProductWithRels;
  variant: VariantOf | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// ---- Public: guest checkout ----

export const checkout = asyncHandler(async (req, res) => {
  const { customerName, phone, email, address, city, zone, note, paymentMethod, items } = req.body as {
    customerName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    zone: 'inside_dhaka' | 'outside_dhaka';
    note?: string;
    paymentMethod?: 'COD' | 'BKASH' | 'SSLCOMMERZ';
    items: CheckoutItem[];
  };

  const setting = await prisma.setting.findFirst();
  const shippingRate =
    zone === 'inside_dhaka'
      ? Number(setting?.shippingInsideDhaka ?? 60)
      : Number(setting?.shippingOutsideDhaka ?? 120);

  // Load & validate all referenced products
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { variants: true, shop: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Build per-shop line groups
  const byShop = new Map<string, Line[]>();
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new ApiError(400, `Product unavailable: ${item.productId}`);
    if (product.shop.status !== 'ACTIVE') throw new ApiError(400, `Shop is inactive for "${product.name}"`);

    let variant: VariantOf | null = null;
    if (item.variantId) {
      variant = product.variants.find((v) => v.id === item.variantId) ?? null;
      if (!variant) throw new ApiError(400, `Variant not found for "${product.name}"`);
      if (variant.stockQty < item.quantity)
        throw new ApiError(400, `Insufficient stock for "${product.name}"`);
    }

    const unitPrice = Number(variant?.priceOverride ?? product.salePrice ?? product.basePrice);
    const lineTotal = round2(unitPrice * item.quantity);
    const arr = byShop.get(product.shopId) ?? [];
    arr.push({ product, variant, quantity: item.quantity, unitPrice, lineTotal });
    byShop.set(product.shopId, arr);
  }

  const orderNo = generateOrderNo();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNo,
        customerName,
        phone,
        email: email ?? null,
        address,
        city,
        zone,
        note: note ?? null,
        paymentMethod: paymentMethod ?? 'COD',
        subtotal: 0,
        shippingTotal: 0,
        grandTotal: 0,
      },
    });

    let subtotalAll = 0;
    let shippingAll = 0;

    for (const [shopId, lines] of byShop) {
      const shop = lines[0].product.shop;
      const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
      const commissionRate = Number(shop.commissionRate);
      const commissionAmount = round2((subtotal * commissionRate) / 100);
      const vendorPayout = round2(subtotal - commissionAmount);

      subtotalAll += subtotal;
      shippingAll += shippingRate; // each shop ships separately

      const subOrder = await tx.subOrder.create({
        data: {
          orderId: created.id,
          shopId,
          subtotal,
          shippingCost: shippingRate,
          commissionRate,
          commissionAmount,
          vendorPayout,
        },
      });

      for (const l of lines) {
        await tx.orderItem.create({
          data: {
            subOrderId: subOrder.id,
            variantId: l.variant?.id ?? null,
            productId: l.product.id,
            productName: l.product.name,
            variantLabel: [l.variant?.size, l.variant?.color].filter(Boolean).join(' / ') || null,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
          },
        });

        if (l.variant) {
          await tx.productVariant.update({
            where: { id: l.variant.id },
            data: { stockQty: { decrement: l.quantity } },
          });
        }
      }
    }

    subtotalAll = round2(subtotalAll);
    shippingAll = round2(shippingAll);

    return tx.order.update({
      where: { id: created.id },
      data: {
        subtotal: subtotalAll,
        shippingTotal: shippingAll,
        grandTotal: round2(subtotalAll + shippingAll),
      },
      include: {
        subOrders: { include: { items: true, shop: { select: { name: true, slug: true } } } },
      },
    });
  });

  res.status(201).json({ message: 'Order placed', order });
});

export const trackOrder = asyncHandler(async (req, res) => {
  const { orderNo, phone } = req.query as Record<string, string>;
  if (!orderNo || !phone) throw new ApiError(400, 'orderNo and phone are required');

  const order = await prisma.order.findFirst({
    where: { orderNo, phone },
    include: {
      subOrders: { include: { items: true, shop: { select: { name: true, slug: true } } } },
    },
  });
  if (!order) throw new ApiError(404, 'Order not found');
  res.json({ order });
});

// ---- Vendor ----

export const listMySubOrders = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: req.user!.sub } });
  if (!shop) throw new ApiError(404, 'Shop not found');

  const subOrders = await prisma.subOrder.findMany({
    where: { shopId: shop.id },
    include: {
      items: true,
      order: {
        select: {
          orderNo: true,
          customerName: true,
          phone: true,
          address: true,
          city: true,
          zone: true,
          paymentMethod: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ subOrders });
});

export const updateSubOrderStatus = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: req.user!.sub } });
  if (!shop) throw new ApiError(404, 'Shop not found');

  const subOrder = await prisma.subOrder.findUnique({ where: { id: req.params.id } });
  if (!subOrder || subOrder.shopId !== shop.id) throw new ApiError(404, 'Sub-order not found');

  const { status, trackingNo, paymentStatus } = req.body;
  const updated = await prisma.subOrder.update({
    where: { id: subOrder.id },
    data: { status, trackingNo, paymentStatus },
  });
  res.json({ subOrder: updated });
});

// ---- Super admin ----

export const adminListOrders = asyncHandler(async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      subOrders: { include: { shop: { select: { name: true, slug: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ orders });
});
