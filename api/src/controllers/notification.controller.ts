import { Request } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

/**
 * A vendor reads their shop's notifications; an admin reads the platform's.
 * The same `shopId`-or-null scoping the media library uses, and the reason
 * there is no cross-shop view: a notification is addressed, not broadcast.
 */
async function inboxScope(req: Request): Promise<string | null> {
  if (req.user?.role === 'SUPER_ADMIN') return null;
  const shop = await prisma.shop.findUnique({
    where: { ownerId: req.user!.sub },
    select: { id: true },
  });
  if (!shop) throw new ApiError(404, 'No shop found for this account');
  return shop.id;
}

export const listNotifications = asyncHandler(async (req, res) => {
  const shopId = await inboxScope(req);
  const take = Math.min(Number(req.query.limit) || 20, 100);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' }, take }),
    prisma.notification.count({ where: { shopId, readAt: null } }),
  ]);

  res.json({ notifications, unreadCount });
});

export const markRead = asyncHandler(async (req, res) => {
  const shopId = await inboxScope(req);
  const existing = await prisma.notification.findFirst({
    where: { id: req.params.id, shopId },
    select: { id: true, readAt: true },
  });
  if (!existing) throw new ApiError(404, 'Notification not found');

  // Keep the original timestamp — re-reading is not a new event
  const notification = existing.readAt
    ? await prisma.notification.findUniqueOrThrow({ where: { id: existing.id } })
    : await prisma.notification.update({
        where: { id: existing.id },
        data: { readAt: new Date() },
      });

  res.json({ notification });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const shopId = await inboxScope(req);
  const { count } = await prisma.notification.updateMany({
    where: { shopId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ message: `${count} marked read`, count });
});
