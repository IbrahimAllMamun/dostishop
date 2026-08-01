import { formatTk } from '@/lib/format';
import { dayLabel } from './theme';

/** Recharts 3 reads `payload`/`label` from context rather than exposing them on
 *  the public `TooltipProps`, so the content component declares its own shape. */
interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  money?: boolean;
  labelIsDate?: boolean;
}

/**
 * Shared tooltip. Values and labels wear text tokens; the coloured dot beside
 * a row is what carries series identity, so nothing rests on colour alone.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  money = true,
  labelIsDate = true,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="card-elevated min-w-40 px-3 py-2 text-sm">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        {labelIsDate && typeof label === 'string' ? dayLabel(label) : label}
      </p>
      {payload.map((entry, i) => (
        <div key={String(entry.dataKey ?? i)} className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums">
            {money ? formatTk(Number(entry.value ?? 0)) : (entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}
