import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Table2 } from 'lucide-react';
import { formatTk } from '@/lib/format';
import { CATEGORICAL, seriesColor, withOther } from './theme';
import { ChartTooltip } from './ChartTooltip';

/**
 * Share of revenue by category.
 *
 * Two of the palette's steps sit under 3:1 against the dark surface, so the
 * legend and the table below are the required relief — identity never rests on
 * colour alone here. The tail beyond six categories folds into "Other" rather
 * than inventing a seventh hue.
 */
export function CategoryDonut({
  data,
}: {
  data: Array<{ name: string; revenue: number }>;
}) {
  const [showTable, setShowTable] = useState(false);
  const rows = withOther(data);
  const total = rows.reduce((n, r) => n + r.revenue, 0);

  if (!rows.length) {
    return <p className="px-5 py-10 text-center text-sm text-muted-foreground">No sales yet.</p>;
  }

  return (
    <div className="p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="revenue"
                nameKey="name"
                innerRadius="60%"
                outerRadius="100%"
                // A 2px surface gap between segments keeps adjacent fills apart
                paddingAngle={2}
                stroke="hsl(var(--surface))"
                strokeWidth={2}
              >
                {rows.map((r, i) => (
                  <Cell key={r.name} fill={seriesColor(i)} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip labelIsDate={false} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend — always present, and the only thing that ties hue to name */}
        <ul className="min-w-0 flex-1 space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.name} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: seriesColor(i) }}
              />
              <span className="truncate">{r.name}</span>
              <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                {total ? Math.round((r.revenue / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors duration-200 hover:text-ink"
      >
        <Table2 className="h-3.5 w-3.5" />
        {showTable ? 'Hide values' : 'Show values'}
      </button>

      {showTable && (
        <div className="mt-2 animate-fade-up overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Revenue by category</caption>
            <thead>
              <tr className="border-b border-ink/5">
                <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Category
                </th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Revenue
                </th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-ink/5 last:border-0">
                  <td className="py-1.5">{r.name}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatTk(r.revenue)}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {total ? Math.round((r.revenue / total) * 100) : 0}%
                  </td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="pt-2">Total</td>
                <td className="pt-2 text-right tabular-nums">{formatTk(total)}</td>
                <td className="pt-2 text-right tabular-nums text-muted-foreground">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { CATEGORICAL };
