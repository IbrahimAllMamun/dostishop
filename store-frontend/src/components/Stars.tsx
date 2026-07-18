export function Stars({ value, className = '' }: { value: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={`text-gold ${className}`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {'★'.repeat(rounded)}
      <span className="text-ink/20">{'★'.repeat(5 - rounded)}</span>
    </span>
  );
}
