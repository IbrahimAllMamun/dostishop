import { create } from 'zustand';
import { api } from '@/lib/api';
import type { AppNotification } from '@/lib/types';

/**
 * One source of truth for the inbox, because there are two views of it.
 *
 * The bell and the notifications page each used to fetch and mark on their own,
 * so marking everything read on the page left the bell showing a stale badge
 * until its next poll — up to a minute of the dashboard contradicting itself.
 */
interface NotificationState {
  items: AppNotification[];
  unreadCount: number;
  loaded: boolean;
  load: (limit?: number) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotifications = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  loaded: false,

  async load(limit = 20) {
    try {
      const d = await api.get<{ notifications: AppNotification[]; unreadCount: number }>(
        `/notifications?limit=${limit}`,
      );
      set({ items: d.notifications, unreadCount: d.unreadCount, loaded: true });
    } catch {
      // A failed poll must not throw a banner across the whole dashboard
      set({ loaded: true });
    }
  },

  async markRead(id) {
    const item = get().items.find((n) => n.id === id);
    if (!item || item.readAt) return;

    // Optimistic: the row and the badge move together, before the round trip
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      await get().load();
    }
  },

  async markAllRead() {
    const stamp = new Date().toISOString();
    set((s) => ({
      items: s.items.map((n) => ({ ...n, readAt: n.readAt ?? stamp })),
      unreadCount: 0,
    }));
    try {
      await api.post('/notifications/read-all');
    } catch {
      await get().load();
    }
  },
}));
