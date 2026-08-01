export const RANGES = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '365d', label: '1 year' },
] as const;

export type RangeKey = (typeof RANGES)[number]['key'];

/** One row of filters above the charts, per the interaction spec. */
export function RangePicker({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (key: RangeKey) => void;
}) {
  return (
    <div role="group" aria-label="Date range" className="flex flex-wrap gap-1.5">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          aria-pressed={value === r.key}
          className={`badge transition-[background-color,color,transform] duration-200 ease-out active:scale-95 ${
            value === r.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-sand text-ink hover:bg-ink/10'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
