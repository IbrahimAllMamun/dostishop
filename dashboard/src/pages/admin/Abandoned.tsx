import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTk, formatDate } from '@/lib/format';
import type { AbandonedCheckout } from '@/lib/types';

const FILTERS = ['OPEN', 'RECOVERED', 'DISMISSED', 'ALL'] as const;

export function AdminAbandoned() {
  const [rows, setRows] = useState<AbandonedCheckout[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('OPEN');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ abandoned: AbandonedCheckout[] }>(`/orders/admin/abandoned?status=${filter}`)
      .then((d) => setRows(d.abandoned))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(load, [load]);

  async function dismiss(id: string) {
    await api.patch(`/orders/admin/abandoned/${id}`, { status: 'DISMISSED' });
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Abandoned checkouts</h1>
          <p className="text-sm text-muted">
            Shoppers who typed their phone at checkout but never placed the order — call them back.
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`badge ${filter === f ? 'bg-ink text-white' : 'bg-sand text-ink'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-muted">Nothing here.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="font-semibold">{r.customerName ?? 'Unknown name'}</p>
                  <a href={`tel:${r.phone}`} className="text-sm text-primary hover:underline">
                    {r.phone}
                  </a>
                </div>
                <StatusBadge status={r.status} />
                <div className="ml-auto text-right">
                  <p className="font-semibold">{formatTk(r.subtotal)}</p>
                  <p className="text-xs text-muted">{formatDate(r.updatedAt)}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 rounded-lg bg-canvas p-3 text-sm">
                {r.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {it.name} × {it.qty}
                    </span>
                    <span>{formatTk(it.price * it.qty)}</span>
                  </div>
                ))}
              </div>
              {r.status === 'OPEN' && (
                <div className="mt-3 flex gap-2">
                  <a href={`tel:${r.phone}`} className="btn-primary btn-sm">
                    📞 Call
                  </a>
                  <button onClick={() => dismiss(r.id)} className="btn-ghost btn-sm">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
