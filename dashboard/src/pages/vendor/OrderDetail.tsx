import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { formatTk, formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderTimeline } from '@/components/OrderTimeline';
import { useDialogs } from '@/components/Dialogs';
import type { SubOrder } from '@/lib/types';

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export function VendorOrderDetail() {
  const { id } = useParams();
  const { notify, prompt } = useDialogs();
  const [subOrder, setSubOrder] = useState<SubOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState('');

  function load() {
    api
      .get<{ subOrder: SubOrder }>(`/orders/vendor/suborders/${id}`)
      .then((d) => {
        setSubOrder(d.subOrder);
        setTracking(d.subOrder.trackingNo ?? '');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function setStatus(status: string) {
    if (!subOrder) return;
    // The note goes onto the event, so the history explains itself later
    const note = await prompt({
      title: `Mark as ${status.toLowerCase()}?`,
      description: 'Add a note for the history — optional but useful later.',
      label: 'Note',
      placeholder: 'e.g. Handed to courier',
      confirmLabel: 'Save',
    });
    // A cancelled prompt returns null; treat that as "don't change anything"
    if (note === null) return;

    setBusy(true);
    try {
      await api.patch(`/orders/vendor/suborders/${subOrder.id}`, { status, note: note || undefined });
      load();
    } catch (e) {
      await notify({
        title: 'Could not update the order',
        description: e instanceof Error ? e.message : 'Failed',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveTracking() {
    if (!subOrder) return;
    setBusy(true);
    try {
      await api.patch(`/orders/vendor/suborders/${subOrder.id}`, { trackingNo: tracking });
      load();
    } catch (e) {
      await notify({
        title: 'Could not save the tracking number',
        description: e instanceof Error ? e.message : 'Failed',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }
  if (!subOrder) return <p className="text-muted-foreground">Order not found.</p>;

  const o = subOrder.order;
  const itemsTotal = (subOrder.items ?? []).reduce((n, it) => n + Number(it.lineTotal), 0);
  const total = Number(subOrder.subtotal) + Number(subOrder.shippingCost);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/vendor/orders"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All orders
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-[-0.02em]">
            {o?.orderNo}
            <StatusBadge status={subOrder.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {o && formatDate(o.createdAt)} · {o?.paymentMethod}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.filter((s) => s !== subOrder.status).map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => setStatus(s)}
              className={s === 'CANCELLED' ? 'btn-ghost btn-sm text-sale' : 'btn-ghost btn-sm'}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {/* Items */}
          <div className="card overflow-hidden">
            <div className="card-head">
              <h2 className="font-semibold">Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink/5">
                    <th className="th">Product</th>
                    <th className="th">Qty</th>
                    <th className="th">Unit</th>
                    <th className="th text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(subOrder.items ?? []).map((it, i) => (
                    <tr
                      key={it.id}
                      style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
                      className="animate-row-in border-b border-ink/5 last:border-0"
                    >
                      <td className="td">
                        <span className="font-medium">{it.productName}</span>
                        {it.variantLabel && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({it.variantLabel})
                          </span>
                        )}
                      </td>
                      <td className="td">{it.quantity}</td>
                      <td className="td">{formatTk(it.unitPrice)}</td>
                      <td className="td text-right">{formatTk(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 border-t border-ink/5 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{formatTk(itemsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatTk(subOrder.shippingCost)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatTk(total)}</span>
              </div>
              <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                <span>Commission</span>
                <span>−{formatTk(subOrder.commissionAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-success-strong">
                <span>Your payout</span>
                <span>{formatTk(subOrder.vendorPayout)}</span>
              </div>
            </div>
          </div>

          <OrderTimeline status={subOrder.status} events={subOrder.events ?? []} />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Deliver to</h2>
            <p className="font-medium">{o?.customerName}</p>
            <p className="text-sm text-muted-foreground">{o?.phone}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {o?.address}
              <br />
              {o?.city}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {o?.zone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'} · shipping{' '}
              {formatTk(subOrder.shippingCost)}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Tracking</h2>
            <label className="label" htmlFor="tracking">
              Courier tracking number
            </label>
            <div className="flex gap-2">
              <input
                id="tracking"
                className="input"
                value={tracking}
                placeholder="—"
                onChange={(e) => setTracking(e.target.value)}
              />
              <button
                onClick={saveTracking}
                disabled={busy || tracking === (subOrder.trackingNo ?? '')}
                className="btn-primary btn-sm shrink-0"
              >
                Save
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Payment</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{o?.paymentMethod}</span>
              <StatusBadge status={subOrder.paymentStatus} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
