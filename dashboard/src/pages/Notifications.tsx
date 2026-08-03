import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { NotificationRow } from '@/components/NotificationBell';
import { useNotifications } from '@/store/notifications';
import type { AppNotification } from '@/lib/types';

/**
 * The full history behind the header bell. Shares the bell's store rather than
 * fetching its own copy, so marking everything read here clears the badge in
 * the same paint instead of a poll later.
 */
export function Notifications() {
  const navigate = useNavigate();
  const items = useNotifications((s) => s.items);
  const unread = useNotifications((s) => s.unreadCount);
  const loaded = useNotifications((s) => s.loaded);
  const load = useNotifications((s) => s.load);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);

  // The bell only keeps the most recent few; this view wants the history
  useEffect(() => {
    load(100);
  }, [load]);

  function openItem(item: AppNotification) {
    markRead(item.id);
    if (item.link) navigate(item.link);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Notifications</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {unread > 0 ? `${unread} unread` : 'Everything here has been read.'}
          </p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={() => markAllRead()} className="btn-ghost btn-sm">
            Mark all read
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {!loaded ? (
          <div className="space-y-px p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <BellOff className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              New orders, payouts and low stock warnings appear here as they happen.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink/5">
            {items.map((n) => (
              <NotificationRow key={n.id} item={n} onOpen={openItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
