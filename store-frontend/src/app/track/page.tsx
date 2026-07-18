'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackOrder } from '@/lib/api';
import { formatTk } from '@/lib/format';
import { useT } from '@/i18n/I18nProvider';
import type { Order } from '@/lib/types';

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function statusColor(status: string): string {
  if (status === 'DELIVERED') return 'bg-success/15 text-success';
  if (status === 'CANCELLED' || status === 'RETURNED') return 'bg-sale/15 text-sale';
  return 'bg-gold/20 text-ink';
}

function TrackInner() {
  const t = useT();
  const params = useSearchParams();
  const [orderNo, setOrderNo] = useState(params.get('orderNo') ?? '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = params.get('orderNo');
    if (q) setOrderNo(q);
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setLoading(true);
    try {
      const o = await trackOrder(orderNo.trim(), phone.trim());
      setOrder(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order not found');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-x max-w-2xl space-y-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-bold">{t('track.title')}</h1>
        <p className="mt-1 text-muted">{t('track.subtitle')}</p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6">
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t('track.orderNo')}</span>
          <input
            required
            className="input"
            placeholder="ORD-20260101-1234"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t('track.phone')}</span>
          <input
            required
            className="input"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('track.searching') : t('track.btn')}
        </button>
        {error && <p className="text-sm text-sale">{error}</p>}
      </form>

      {order && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{order.orderNo}</p>
              <p className="text-sm text-muted">
                Placed {new Date(order.createdAt).toLocaleDateString()} · {order.paymentMethod}
              </p>
            </div>
            <span className="font-semibold">{formatTk(order.grandTotal)}</span>
          </div>

          {order.subOrders.map((s) => (
            <div key={s.id} className="space-y-2 rounded-2xl border border-ink/10 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.shop?.name ?? 'Shop'}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(s.status)}`}
                >
                  {s.status}
                </span>
              </div>

              {/* progress */}
              {STATUS_STEPS.includes(s.status) && (
                <div className="flex gap-1">
                  {STATUS_STEPS.map((step, idx) => {
                    const reached = STATUS_STEPS.indexOf(s.status) >= idx;
                    return (
                      <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full ${reached ? 'bg-primary' : 'bg-ink/10'}`}
                      />
                    );
                  })}
                </div>
              )}

              <div className="space-y-1 pt-1 text-sm text-muted">
                {s.items?.map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span>
                      {it.productName}
                      {it.variantLabel ? ` (${it.variantLabel})` : ''} × {it.quantity}
                    </span>
                    <span>{formatTk(it.lineTotal)}</span>
                  </div>
                ))}
                {s.trackingNo && (
                  <p className="pt-1 text-xs">Courier tracking: {s.trackingNo}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="container-x py-20 text-center text-muted">Loading…</div>}>
      <TrackInner />
    </Suspense>
  );
}
