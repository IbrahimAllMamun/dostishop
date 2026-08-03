import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Raising notifications.
 *
 * Every emitter here is best-effort and never awaited by the request that
 * triggered it. A vendor missing a bell badge is a small loss; a checkout that
 * fails because the notification insert timed out is a real one, and checkout
 * already runs against a remote database inside a tight transaction budget.
 */

/** Stock at or below this raises a low-stock notice. */
export const LOW_STOCK_THRESHOLD = 5;

interface NotifyInput {
  /** The shop this is for; null addresses the platform admins. */
  shopId: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  /**
   * Supplied when the underlying condition can repeat. While an unread
   * notification with the same key exists, no second one is raised.
   */
  key?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  const { shopId, type, title, body, link, key } = input;

  if (key) {
    const pending = await prisma.notification.findFirst({
      where: { shopId, type, key, readAt: null },
      select: { id: true },
    });
    if (pending) return;
  }

  await prisma.notification.create({ data: { shopId, type, title, body, link, key } });
}

/** Fire and forget: the caller's response must not wait on, or fail with, this. */
export function notifyInBackground(input: NotifyInput): void {
  notify(input).catch(() => {
    // A dropped notification is not worth surfacing to the customer or vendor
  });
}

/**
 * One notice per shop in the order, plus one for the platform.
 *
 * Called after the checkout transaction commits. Inside it, these writes would
 * add a round trip per shop to a transaction that already has a 20s ceiling
 * against a remote database.
 */
export function notifyOrderPlaced(params: {
  orderNo: string;
  subOrders: Array<{ id: string; shopId: string; subtotal: unknown }>;
  customerName: string;
}): void {
  const { orderNo, subOrders, customerName } = params;

  for (const sub of subOrders) {
    notifyInBackground({
      shopId: sub.shopId,
      type: 'ORDER_PLACED',
      title: `New order ${orderNo}`,
      body: `${customerName} placed an order with your shop.`,
      link: `/vendor/orders/${sub.id}`,
    });
  }

  notifyInBackground({
    shopId: null,
    type: 'ORDER_PLACED',
    title: `New order ${orderNo}`,
    body:
      subOrders.length === 1
        ? 'One shop is fulfilling it.'
        : `Split across ${subOrders.length} shops.`,
    link: '/admin/orders',
  });
}

export function notifyShopApproved(shopId: string, shopName: string): void {
  notifyInBackground({
    shopId,
    type: 'SHOP_APPROVED',
    title: 'Your shop is approved',
    body: `${shopName} is live. Your products are now visible to shoppers.`,
    link: '/vendor/shop',
  });
}

export function notifyPayoutSettled(shopId: string, amount: string): void {
  notifyInBackground({
    shopId,
    type: 'PAYOUT_SETTLED',
    title: 'Payout marked paid',
    body: `৳${amount} has been settled.`,
    link: '/vendor/payouts',
  });
}

/**
 * Check the variants an order touched and warn on the ones now running out.
 *
 * Keyed by variant so a shop is told once per variant until it reads the
 * notice, rather than on every subsequent sale of the same low item.
 */
export async function notifyLowStock(variantIds: string[]): Promise<void> {
  if (!variantIds.length) return;

  const low = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, stockQty: { lte: LOW_STOCK_THRESHOLD } },
    select: {
      id: true,
      stockQty: true,
      size: true,
      color: true,
      product: { select: { id: true, name: true, shopId: true } },
    },
  });

  for (const v of low) {
    const label = [v.size, v.color].filter(Boolean).join(' / ');
    await notify({
      shopId: v.product.shopId,
      type: 'LOW_STOCK',
      title: v.stockQty === 0 ? `${v.product.name} is out of stock` : `${v.product.name} is running low`,
      body: `${label ? `${label} — ` : ''}${v.stockQty} left.`,
      link: `/vendor/products`,
      key: `variant:${v.id}`,
    }).catch(() => {});
  }
}
