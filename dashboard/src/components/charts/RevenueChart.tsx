import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, GRID_STROKE, dayLabel, seriesColor } from './theme';
import { ChartTooltip } from './ChartTooltip';

/**
 * Revenue over time. One series, so no legend — the card title names it.
 * Deliberately not a dual-axis chart with orders overlaid: two measures on two
 * scales is the single most misread chart form. Orders get their own tile.
 */
export function RevenueChart({
  data,
  height = 260,
}: {
  data: Array<{ date: string; revenue: number }>;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesColor(0)} stopOpacity={0.3} />
              <stop offset="100%" stopColor={seriesColor(0)} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="date"
            {...AXIS}
            // `preserveStartEnd` keeps the newest day labelled. A fixed stride
            // silently dropped it whenever the window length was not a
            // multiple of the stride — so "today" had no tick.
            interval="preserveStartEnd"
            tickFormatter={dayLabel}
            minTickGap={24}
          />
          <YAxis
            {...AXIS}
            width={56}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: 'hsl(var(--ink) / 0.25)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={seriesColor(0)}
            strokeWidth={2}
            fill="url(#revenueFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--surface))' }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
