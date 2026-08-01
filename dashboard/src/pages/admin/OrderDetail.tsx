import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { formatTk, formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderTimeline } from '@/components/OrderTimeline';
import type { Order } from '@/lib/types';

/**
 * The admin view is the whole customer order: one checkout, N sub-orders, one
 * per shop. Each sub-order carries its own status and its own timeline, which
 * is why this page is a stack of them rather than a single tracker.
 */
export function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ order: Order }>(`/orders/admin/${id}`)
      .then((d) => setOrder(d.order))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }
  if (!order) return <p className="text-muted-foreground">Order not found.</p>;

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/admin/orders"
          className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All orders
        </Link>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">{order.orderNo}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(order.createdAt)} · {order.paymentMethod} ·{' '}
          {order.subOrders.length} shop{order.subOrders.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {order.subOrders.map((s) => {
            const total = Number(s.subtotal) + Number(s.shippingCost);
            return (
              <div key={s.id} className="space-y-4">
                <div className="card overflow-hidden">
                  <div className="card-head">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{s.shop?.name}</h2>
                      <StatusBadge status={s.status} />
                    </div>
                    <span className="text-sm text-muted-foreground">{formatTk(total)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-ink/5">
                          <th className="th">Product</th>
                          <th className="th">Qty</th>
                          <th className="th text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(s.items ?? []).map((it) => (
                          <tr key={it.id} className="border-b border-ink/5 last:border-0">
                            <td className="td">
                              {it.productName}
                              {it.variantLabel && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({it.variantLabel})
                                </span>
                              )}
                            </td>
                            <td className="td">{it.quantity}</td>
                            <td className="td text-right">{formatTk(it.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between border-t border-ink/5 px-4 py-2.5 text-xs text-muted-foreground">
                    <span>
                      Commission {formatTk(s.commissionAmount)} · payout{' '}
                      {formatTk(s.vendorPayout)}
                    </span>
                    {s.trackingNo && <span>Tracking {s.trackingNo}</span>}
                  </div>
                </div>

                <OrderTimeline status={s.status} events={s.events ?? []} />
              </div>
            );
          })}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Customer</h2>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-sm text-muted-foreground">{order.phone}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {order.address}
              <br />
              {order.city}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Totals</h2>
            <div className="space-y-1 text-sm">
              {order.discount != null && Number(order.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>−{formatTk(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Grand total</span>
                <span>{formatTk(order.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
