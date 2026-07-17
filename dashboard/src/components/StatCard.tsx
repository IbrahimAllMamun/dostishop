export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'primary' | 'warn' | 'success';
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
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
