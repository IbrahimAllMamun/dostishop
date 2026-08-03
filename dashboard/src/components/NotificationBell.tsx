import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, PackageCheck, ShoppingBag, Store, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useNotifications } from '@/store/notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AppNotification, NotificationType } from '@/lib/types';

/**
 * The header bell.
 *
 * Polls rather than holding a socket: this dashboard has at most a handful of
 * concurrent users per shop, and a minute of latency on a "new order" badge is
 * not worth a websocket layer on a free Render dyno.
 */
const POLL_MS = 60_000;

/** Each type gets its own tint, so the list is scannable without reading it. */
const LOOK: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  ORDER_PLACED: { icon: ShoppingBag, className: 'bg-primary/15 text-primary-strong' },
  SHOP_APPROVED: { icon: Store, className: 'bg-success/15 text-success-strong' },
  PAYOUT_SETTLED: { icon: PackageCheck, className: 'bg-gold/20 text-warn-strong' },
  LOW_STOCK: { icon: TriangleAlert, className: 'bg-sale/15 text-sale-strong' },
};

/** "3 minutes ago" beats a timestamp for something that just happened. */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function NotificationRow({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
}) {
  const { icon: Icon, className } = LOOK[item.type] ?? LOOK.ORDER_PLACED;
  const unread = !item.readAt;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-[background-color] duration-200 ease-out hover:bg-muted ${
        unread ? 'bg-primary/[0.04]' : ''
      }`}
    >
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${className}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="flex-1 text-sm font-medium leading-snug">{item.title}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {timeAgo(item.createdAt)}
          </span>
        </span>
        {item.body && (
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {item.body}
          </span>
        )}
      </span>
      {/* Unread is carried by a dot as well as the tint, since a faint
          background alone is not a reliable signal */}
      {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
    </button>
  );
}

export function NotificationBell() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const base = user?.role === 'SUPER_ADMIN' ? '/admin' : '/vendor';

  const items = useNotifications((s) => s.items);
  const unread = useNotifications((s) => s.unreadCount);
  const load = useNotifications((s) => s.load);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    load();
    const id = setInterval(() => load(), POLL_MS);
    return () => clearInterval(id);
  }, [user, load]);

  // Opening it is a good moment to be current
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function openItem(item: AppNotification) {
    setOpen(false);
    markRead(item.id);
    if (item.link) navigate(item.link);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="row-action relative hover:text-ink"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-sale px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="flex items-center justify-between border-b border-ink/5 px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-xs text-primary transition-colors hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Nothing yet. New orders and payouts will show up here.
            </p>
          ) : (
            <div className="divide-y divide-ink/5">
              {items.map((n) => (
                <NotificationRow key={n.id} item={n} onOpen={openItem} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-ink/5 p-2">
          <Link
            to={`${base}/notifications`}
            onClick={() => setOpen(false)}
            className="btn-primary btn-sm w-full"
          >
            View all
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
