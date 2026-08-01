import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTk } from '@/lib/format';
import { StatsSkeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/charts/StatTile';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { RangePicker, type RangeKey } from '@/components/charts/RangePicker';
import { seriesColor } from '@/components/charts/theme';
import type { VendorAnalytics as Data } from '@/lib/analytics';

export function VendorAnalytics() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Data>(`/analytics/vendor?range=${range}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(load, [load]);

  if (error) return <p className="text-sale-strong">{error}</p>;

  const spark = (key: 'revenue' | 'orders') => (data?.daily ?? []).map((d) => ({ value: d[key] }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Analytics</h1>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {loading || !data ? (
        <>
          <StatsSkeleton />
          <div className="skeleton h-72 w-full" />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Revenue"
              value={formatTk(data.summary.revenue)}
              trend={data.summary.trend.revenue}
              series={spark('revenue')}
              color={seriesColor(0)}
              index={0}
            />
            <StatTile
              label="Your payout"
              value={formatTk(data.summary.payout)}
              trend={data.summary.trend.payout}
              hint="After commission"
              index={1}
            />
            <StatTile
              label="Orders"
              value={data.summary.orders}
              trend={data.summary.trend.orders}
              series={spark('orders')}
              color={seriesColor(3)}
              index={2}
            />
            <StatTile
              label="Avg order value"
              value={formatTk(data.summary.avgOrderValue)}
              index={3}
            />
          </div>

          <div className="card overflow-hidden">
            <div className="card-head">
              <h2 className="font-semibold">Revenue</h2>
            </div>
            <div className="p-3">
              <RevenueChart data={data.daily} />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="card-head">
                <h2 className="font-semibold">Top products</h2>
                <span className="text-xs text-muted-foreground">by revenue</span>
              </div>
              {data.topProducts.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Nothing sold in this period.
                </p>
              ) : (
                <ul className="divide-y divide-ink/5">
                  {data.topProducts.map((p, i) => (
                    <li
                      key={p.productId}
                      style={{ animationDelay: `${i * 25}ms` }}
                      className="flex animate-row-in items-center gap-3 px-5 py-2.5"
                    >
                      <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.unitsSold} sold
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums">{formatTk(p.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="card-head">
                <h2 className="font-semibold">Orders by status</h2>
                <span className="text-xs text-muted-foreground">all time</span>
              </div>
              {data.byStatus.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <ul className="divide-y divide-ink/5">
                  {data.byStatus.map((s) => (
                    <li key={s.status} className="flex items-center gap-3 px-5 py-2.5">
                      <StatusBadge status={s.status} />
                      <span className="ml-auto text-sm tabular-nums">{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
