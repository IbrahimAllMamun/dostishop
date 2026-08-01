import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { formatTk } from '@/lib/format';
import { useDialogs } from '@/components/Dialogs';
import { StatsSkeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/charts/StatTile';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { RangePicker, RANGES, type RangeKey } from '@/components/charts/RangePicker';
import { seriesColor } from '@/components/charts/theme';
import { DataTable, type Column } from '@/components/DataTable';
import type { AdminAnalytics, RankedProduct } from '@/lib/analytics';

/**
 * The reporting view: the same aggregates as the overview, but arranged for
 * reading a period rather than glancing at today, and with the tables that
 * back every chart.
 */
export function AdminReport() {
  const { notify } = useDialogs();
  const [range, setRange] = useState<RangeKey>('90d');
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

  async function exportOrders() {
    const token = useAuth.getState().token;
    const res = await fetch(`${API_URL}/orders/admin/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      await notify({ title: 'Export failed', description: 'Please try again.', tone: 'danger' });
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? range;

  const productColumns: Column<RankedProduct>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      value: (p) => p.name,
      render: (p) => <span className="font-medium">{p.name}</span>,
    },
    {
      key: 'units',
      header: 'Units sold',
      sortable: true,
      value: (p) => p.unitsSold,
      render: (p) => <span className="tabular-nums">{p.unitsSold}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      sortable: true,
      value: (p) => p.revenue,
      className: 'text-right',
      render: (p) => <span className="tabular-nums">{formatTk(p.revenue)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Report</h1>
          <p className="text-sm text-muted-foreground">Last {rangeLabel.toLowerCase()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangePicker value={range} onChange={setRange} />
          <button onClick={exportOrders} className="btn-ghost btn-sm">
            <Download className="h-3.5 w-3.5" /> Export orders
          </button>
        </div>
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
              series={data.daily.map((d) => ({ value: d.revenue }))}
              color={seriesColor(0)}
              index={0}
            />
            <StatTile
              label="Commission"
              value={formatTk(data.summary.commission)}
              trend={data.summary.trend.commission}
              index={1}
            />
            <StatTile
              label="Orders"
              value={data.summary.orders}
              trend={data.summary.trend.orders}
              series={data.daily.map((d) => ({ value: d.orders }))}
              color={seriesColor(3)}
              index={2}
            />
            <StatTile
              label="Avg order value"
              value={formatTk(data.summary.avgOrderValue)}
              hint={`${data.summary.customers} customers`}
              index={3}
            />
          </div>

          <div className="card overflow-hidden">
            <div className="card-head">
              <h2 className="font-semibold">Revenue over time</h2>
              <span className="text-xs text-muted-foreground">Cancelled orders excluded</span>
            </div>
            <div className="p-3">
              <RevenueChart data={data.daily} height={300} />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="card-head">
                <h2 className="font-semibold">Sales by category</h2>
              </div>
              <CategoryDonut data={data.byCategory} />
            </div>

            <div className="card overflow-hidden">
              <div className="card-head">
                <h2 className="font-semibold">Seller statistics</h2>
              </div>
              {data.topShops.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No sales in this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-ink/5">
                        <th className="th">Shop</th>
                        <th className="th">Orders</th>
                        <th className="th text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topShops.map((s, i) => (
                        <tr
                          key={s.shopId}
                          style={{ animationDelay: `${i * 25}ms` }}
                          className="animate-row-in border-b border-ink/5 last:border-0"
                        >
                          <td className="td font-medium">{s.name}</td>
                          <td className="td tabular-nums">{s.orders}</td>
                          <td className="td text-right tabular-nums">{formatTk(s.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-semibold">Top products</h2>
            <DataTable
              columns={productColumns}
              rows={data.topProducts}
              getRowId={(p) => p.productId}
              search={false}
              empty="Nothing sold in this period."
            />
          </div>
        </>
      )}
    </div>
  );
}
