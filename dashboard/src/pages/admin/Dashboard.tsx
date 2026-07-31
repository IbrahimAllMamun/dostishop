import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { formatTk } from '@/lib/format';
import type { Order, Shop } from '@/lib/types';

export function AdminDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ shops: Shop[] }>('/shops/admin'),
      api.get<{ orders: Order[] }>('/orders/admin/all'),
    ])
      .then(([s, o]) => {
        setShops(s.shops);
        setOrders(o.orders);
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingShops = shops.filter((s) => s.status === 'PENDING').length;
  const activeShops = shops.filter((s) => s.status === 'ACTIVE').length;
  const revenue = orders.reduce((n, o) => n + Number(o.grandTotal), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total orders" value={orders.length} tone="primary" />
            <StatCard label="Gross sales" value={formatTk(revenue)} tone="success" />
            <StatCard
              label="Pending approvals"
              value={pendingShops}
              tone={pendingShops ? 'warn' : 'default'}
              hint="Shops awaiting review"
            />
            <StatCard label="Active shops" value={activeShops} />
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-ink/5 px-4 py-3 font-semibold">Recent orders</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink/5">
                    <th className="th">Order</th>
                    <th className="th">Customer</th>
                    <th className="th">Shops</th>
                    <th className="th">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 8).map((o) => (
                    <tr key={o.id} className="border-b border-ink/5 last:border-0">
                      <td className="td font-medium">{o.orderNo}</td>
                      <td className="td">{o.customerName}</td>
                      <td className="td">{o.subOrders.length}</td>
                      <td className="td">{formatTk(o.grandTotal)}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td className="td text-muted-foreground" colSpan={4}>
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
