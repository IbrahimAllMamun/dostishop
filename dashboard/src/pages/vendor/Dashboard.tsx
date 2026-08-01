import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { StatCard } from '@/components/StatCard';
import { StatsSkeleton } from '@/components/Skeleton';
import { formatTk } from '@/lib/format';
import type { Product, SubOrder } from '@/lib/types';

export function VendorDashboard() {
  const user = useAuth((s) => s.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [subOrders, setSubOrders] = useState<SubOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ products: Product[] }>('/products/mine').catch(() => ({ products: [] })),
      api.get<{ subOrders: SubOrder[] }>('/orders/vendor/mine').catch(() => ({ subOrders: [] })),
    ])
      .then(([p, o]) => {
        setProducts(p.products);
        setSubOrders(o.subOrders);
      })
      .finally(() => setLoading(false));
  }, []);

  const pending = subOrders.filter((s) => s.status === 'PENDING').length;
  const payout = subOrders.reduce((n, s) => n + Number(s.vendorPayout), 0);
  const lowStock = products.filter(
    (p) => (p.variants ?? []).reduce((n, v) => n + v.stockQty, 0) <= 3,
  ).length;

  const shopPending = user?.shop?.status === 'PENDING';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      {shopPending && (
        <div className="rounded-xl bg-gold/15 px-4 py-3 text-sm text-warn">
          Your shop is <strong>pending approval</strong>. You can set up your profile, but products
          go live once an admin approves your shop.
        </div>
      )}

      {loading ? (
        <StatsSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Products" value={products.length} tone="primary" index={0} />
            <StatCard
              label="New orders"
              value={pending}
              tone={pending ? 'warn' : 'default'}
              index={1}
            />
            <StatCard
              label="Est. payout"
              value={formatTk(payout)}
              tone="success"
              hint="After commission"
              index={2}
            />
            <StatCard
              label="Low stock"
              value={lowStock}
              tone={lowStock ? 'warn' : 'default'}
              index={3}
            />
          </div>

          <div className="flex gap-3">
            <Link to="/vendor/products/new" className="btn-primary">
              + Add product
            </Link>
            <Link to="/vendor/orders" className="btn-ghost">
              View orders
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
