export function formatTk(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
