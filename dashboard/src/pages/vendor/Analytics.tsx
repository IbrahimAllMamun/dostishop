import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTk } from '@/lib/format';

interface Analytics {
  summary: { revenue: number; payout: number; orders: number; avgOrderValue: number };
  byStatus: Array<{ status: string; count: number }>;
  daily: Array<{ date: string; revenue: number }>;
  topProducts: Array<{ productId: string; name: string; revenue: number; unitsSold: number }>;
}

export function VendorAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Analytics>('/analytics/vendor')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  if (error) return <p className="text-sale">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Loading…</p>;

  const max = Math.max(...data.daily.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (all time)" value={formatTk(data.summary.revenue)} tone="primary" />
        <StatCard label="Your payout" value={formatTk(data.summary.payout)} tone="success" hint="After commission" />
        <StatCard label="Orders" value={data.summary.orders} />
        <StatCard label="Avg order value" value={formatTk(data.summary.avgOrderValue)} />
      </div>

      {/* 30-day revenue bar chart */}
      <div className="card p-5">
        <p className="mb-4 font-semibold">Revenue — last 30 days</p>
        <div className="flex h-40 items-end gap-[3px]">
          {data.daily.map((d) => (
            <div key={d.date} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
                style={{ height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 4 : 1)}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
                {d.date.slice(5)} · {formatTk(d.revenue)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{data.daily[0]?.date}</span>
          <span>{data.daily[data.daily.length - 1]?.date}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <div className="card overflow-hidden">
          <p className="border-b border-ink/5 px-4 py-3 font-semibold">Top products</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/5">
                <th className="th">Product</th>
                <th className="th">Units</th>
                <th className="th">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.length === 0 ? (
                <tr>
                  <td className="td text-muted-foreground" colSpan={3}>
                    No sales yet.
                  </td>
                </tr>
              ) : (
                data.topProducts.map((p) => (
                  <tr key={p.productId} className="border-b border-ink/5 last:border-0">
                    <td className="td">{p.name}</td>
                    <td className="td">{p.unitsSold}</td>
                    <td className="td font-medium">{formatTk(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Status breakdown */}
        <div className="card p-5">
          <p className="mb-3 font-semibold">Orders by status</p>
          <div className="space-y-2">
            {data.byStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <StatusBadge status={s.status} />
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
            {data.byStatus.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
