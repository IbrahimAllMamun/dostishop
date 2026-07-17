import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTk, formatDate } from '@/lib/format';
import type { SubOrder } from '@/lib/types';

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export function VendorOrders() {
  const [subOrders, setSubOrders] = useState<SubOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    api
      .get<{ subOrders: SubOrder[] }>('/orders/vendor/mine')
      .then((d) => setSubOrders(d.subOrders))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateStatus(id: string, status: string) {
    setBusy(id);
    try {
      await api.patch(`/orders/vendor/suborders/${id}`, { status });
      setSubOrders((arr) => arr.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function saveTracking(id: string, trackingNo: string) {
    setBusy(id);
    try {
      await api.patch(`/orders/vendor/suborders/${id}`, { trackingNo });
      setSubOrders((arr) => arr.map((s) => (s.id === id ? { ...s, trackingNo } : s)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      {subOrders.length === 0 ? (
        <div className="card p-8 text-center text-muted">No orders yet.</div>
      ) : (
        <div className="space-y-4">
          {subOrders.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.order?.orderNo}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {s.order && formatDate(s.order.createdAt)} · {s.order?.paymentMethod}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">Payout {formatTk(s.vendorPayout)}</div>
                  <div className="text-xs text-muted">
                    Subtotal {formatTk(s.subtotal)} · commission {formatTk(s.commissionAmount)}
                  </div>
                </div>
              </div>

              {/* Customer + items */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-canvas p-3 text-sm">
                  <p className="font-medium">{s.order?.customerName}</p>
                  <p className="text-muted">{s.order?.phone}</p>
                  <p className="text-muted">
                    {s.order?.address}, {s.order?.city}
                  </p>
                  <p className="text-xs text-muted">
                    {s.order?.zone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'} · shipping{' '}
                    {formatTk(s.shippingCost)}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  {s.items?.map((it) => (
                    <div key={it.id} className="flex justify-between">
                      <span>
                        {it.productName}
                        {it.variantLabel ? ` (${it.variantLabel})` : ''} × {it.quantity}
                      </span>
                      <span>{formatTk(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink/5 pt-4">
                <label className="text-sm text-muted">Update status</label>
                <select
                  className="input w-auto"
                  value={s.status}
                  disabled={busy === s.id}
                  onChange={(e) => updateStatus(s.id, e.target.value)}
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <input
                  className="input w-52"
                  placeholder="Courier tracking no."
                  defaultValue={s.trackingNo ?? ''}
                  onBlur={(e) => {
                    if (e.target.value !== (s.trackingNo ?? '')) saveTracking(s.id, e.target.value);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
