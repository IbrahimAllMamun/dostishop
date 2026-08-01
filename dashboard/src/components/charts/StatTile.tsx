import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';

/**
 * Headline number with an optional sparkline. A sparkline is a texture, not a
 * chart — no axes, no tooltip, no legend. The number is the subject.
 */
export function StatTile({
  label,
  value,
  hint,
  trend,
  series,
  color = 'hsl(var(--primary))',
  index = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** Percentage change vs the previous equal window; null = no basis */
  trend?: number | null;
  series?: Array<{ value: number }>;
  color?: string;
  index?: number;
}) {
  const up = (trend ?? 0) >= 0;
  const hasSeries = (series?.length ?? 0) > 1;

  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className="card animate-fade-up overflow-hidden p-5"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold tabular-nums tracking-[-0.02em]">{value}</p>
        {trend != null && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              up ? 'text-success-strong' : 'text-sale-strong'
            }`}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}

      {hasSeries && (
        <div className="mt-3 h-10" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#spark-${label.replace(/\W/g, '')})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
