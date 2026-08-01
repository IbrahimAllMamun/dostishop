export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  index = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'primary' | 'warn' | 'success';
  /** Position in the row — drives a small entrance stagger. */
  index?: number;
}) {
  const toneClass =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'warn'
        ? 'text-warn'
        : tone === 'success'
          ? 'text-success'
          : 'text-ink';
  return (
    <div
      className="card animate-fade-up p-5 transition-shadow duration-200 ease-out hover:shadow-lift"
      style={{ animationDelay: `${Math.min(index, 5) * 50}ms` }}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
