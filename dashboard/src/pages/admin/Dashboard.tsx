import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatTk } from '@/lib/format';
import { StatsSkeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/charts/StatTile';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { RangePicker, type RangeKey } from '@/components/charts/RangePicker';
import { seriesColor } from '@/components/charts/theme';
import type { AdminAnalytics } from '@/lib/analytics';

export function AdminDashboard() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<AdminAnalytics>(`/analytics/admin?range=${range}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(load, [load]);

  const spark = (key: 'revenue' | 'orders') => (data?.daily ?? []).map((d) => ({ value: d[key] }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Overview</h1>
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
              label="Orders"
              value={data.summary.orders}
              trend={data.summary.trend.orders}
              series={spark('orders')}
              color={seriesColor(3)}
              index={1}
            />
            <StatTile
              label="Commission earned"
              value={formatTk(data.summary.commission)}
              trend={data.summary.trend.commission}
              hint="The platform's share"
              index={2}
            />
            <StatTile
              label="Customers"
              value={data.summary.customers}
              hint="Distinct phone numbers"
              index={3}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <div className="card overflow-hidden">
              <div className="card-head">
                <h2 className="font-semibold">Revenue</h2>
                <span className="text-xs text-muted-foreground">
                  Avg order {formatTk(data.summary.avgOrderValue)}
                </span>
              </div>
              <div className="p-3">
                <RevenueChart data={data.daily} />
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="card-head">
                <h2 className="font-semibold">Sales by category</h2>
              </div>
              <CategoryDonut data={data.byCategory} />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <RankCard
              title="Top products"
              rows={data.topProducts.map((p) => ({
                key: p.productId,
                name: p.name,
                meta: `${p.unitsSold} sold`,
                value: formatTk(p.revenue),
              }))}
            />
            <RankCard
              title="Best shops"
              rows={data.topShops.map((s) => ({
                key: s.shopId,
                name: s.name,
                meta: `${s.orders} order${s.orders === 1 ? '' : 's'}`,
                value: formatTk(s.revenue),
              }))}
              footer={
                <Link to="/admin/shops" className="text-xs text-primary hover:underline">
                  All shops
                </Link>
              }
            />
            <RankCard
              title="Top customers"
              rows={data.topCustomers.map((c) => ({
                key: c.phone,
                name: c.name,
                meta: `${c.phone} · ${c.orders} order${c.orders === 1 ? '' : 's'}`,
                value: formatTk(c.spent),
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function RankCard({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: Array<{ key: string; name: string; meta: string; value: string }>;
  footer?: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="card-head">
        <h2 className="font-semibold">{title}</h2>
        {footer}
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <ul className="divide-y divide-ink/5">
          {rows.map((r, i) => (
            <li
              key={r.key}
              style={{ animationDelay: `${i * 25}ms` }}
              className="flex animate-row-in items-center gap-3 px-5 py-2.5"
            >
              <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{r.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.meta}</span>
              </span>
              <span className="shrink-0 text-sm tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
