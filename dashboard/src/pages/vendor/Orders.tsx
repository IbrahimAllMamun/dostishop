import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTk, formatDate } from '@/lib/format';
import type { SubOrder } from '@/lib/types';

function printInvoice(s: SubOrder, shopName: string) {
  const rows = (s.items ?? [])
    .map(
      (it) =>
        `<tr><td>${it.productName}${it.variantLabel ? ` (${it.variantLabel})` : ''}</td><td style="text-align:center">${it.quantity}</td><td style="text-align:right">৳${Number(it.unitPrice)}</td><td style="text-align:right">৳${Number(it.lineTotal)}</td></tr>`,
    )
    .join('');
  const total = Number(s.subtotal) + Number(s.shippingCost);
  const html = `<!doctype html><html><head><title>Invoice ${s.order?.orderNo ?? ''}</title>
<style>body{font-family:Arial,sans-serif;max-width:640px;margin:24px auto;padding:0 16px;color:#222}
h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border-bottom:1px solid #ddd;padding:8px 4px;font-size:14px;text-align:left}
.tot td{font-weight:bold;border-top:2px solid #222}.muted{color:#777;font-size:13px}</style></head><body>
<h1>${shopName} — Invoice</h1>
<p class="muted">Order ${s.order?.orderNo ?? ''} · ${s.order ? new Date(s.order.createdAt).toLocaleDateString() : ''} · ${s.order?.paymentMethod ?? ''}</p>
<p><strong>${s.order?.customerName ?? ''}</strong><br/>${s.order?.phone ?? ''}<br/>${s.order?.address ?? ''}, ${s.order?.city ?? ''}</p>
<table><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr>
${rows}
<tr><td colspan="3" style="text-align:right">Subtotal</td><td style="text-align:right">৳${Number(s.subtotal)}</td></tr>
<tr><td colspan="3" style="text-align:right">Shipping</td><td style="text-align:right">৳${Number(s.shippingCost)}</td></tr>
<tr class="tot"><td colspan="3" style="text-align:right">Total (${s.order?.paymentMethod === 'COD' ? 'collect on delivery' : 'paid'})</td><td style="text-align:right">৳${total}</td></tr>
</table>
<p class="muted">Thank you for shopping with ${shopName} on Boutique BD.</p>
<script>window.print()</script></body></html>`;
  const w = window.open('', '_blank', 'width=720,height=900');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const TABS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: '📞 Needs confirmation' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export function VendorOrders() {
  const shopName = useAuth((s) => s.user?.shop?.name ?? 'Shop');
  const [subOrders, setSubOrders] = useState<SubOrder[]>([]);
  const [tab, setTab] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = tab ? `?status=${tab}` : '';
    api
      .get<{ subOrders: SubOrder[] }>(`/orders/vendor/mine${q}`)
      .then((d) => setSubOrders(d.subOrders))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(load, [load]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`badge ${tab === t.key ? 'bg-ink text-white' : 'bg-sand text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'PENDING' && subOrders.length > 0 && (
        <div className="rounded-xl bg-gold/15 px-4 py-3 text-sm text-warn">
          These orders are waiting for a confirmation call. Call the customer, then set the status
          to CONFIRMED (or CANCELLED if unreachable/fake).
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : subOrders.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">
          {tab === 'PENDING' ? 'No orders waiting for confirmation. 🎉' : 'No orders here.'}
        </div>
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
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.order && formatDate(s.order.createdAt)} · {s.order?.paymentMethod}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">Payout {formatTk(s.vendorPayout)}</div>
                  <div className="text-xs text-muted-foreground">
                    Subtotal {formatTk(s.subtotal)} · commission {formatTk(s.commissionAmount)}
                  </div>
                </div>
              </div>

              {/* Customer + items */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-canvas p-3 text-sm">
                  <p className="font-medium">{s.order?.customerName}</p>
                  <p className="text-muted-foreground">{s.order?.phone}</p>
                  <p className="text-muted-foreground">
                    {s.order?.address}, {s.order?.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                <label className="text-sm text-muted-foreground">Update status</label>
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
                <button
                  onClick={() => printInvoice(s, shopName)}
                  className="btn-ghost btn-sm ml-auto"
                >
                  🖨 Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
