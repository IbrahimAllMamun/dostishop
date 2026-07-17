import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTk, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ orders: Order[] }>('/orders/admin/all')
      .then((d) => setOrders(d.orders))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/5">
              <th className="th">Order</th>
              <th className="th">Date</th>
              <th className="th">Customer</th>
              <th className="th">Shops / status</th>
              <th className="th">Payment</th>
              <th className="th">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="td text-muted" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td className="td text-muted" colSpan={6}>
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-ink/5 align-top last:border-0">
                  <td className="td font-medium">{o.orderNo}</td>
                  <td className="td whitespace-nowrap text-muted">{formatDate(o.createdAt)}</td>
                  <td className="td">
                    <div>{o.customerName}</div>
                    <div className="text-xs text-muted">{o.phone}</div>
                  </td>
                  <td className="td">
                    <div className="flex flex-col gap-1">
                      {o.subOrders.map((s) => (
                        <div key={s.id} className="flex items-center gap-2">
                          <span className="text-xs text-muted">{s.shop?.name}</span>
                          <StatusBadge status={s.status} />
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="td">{o.paymentMethod}</td>
                  <td className="td font-medium">{formatTk(o.grandTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
