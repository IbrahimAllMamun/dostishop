const MAP: Record<string, string> = {
  ACTIVE: 'bg-success/15 text-success',
  DELIVERED: 'bg-success/15 text-success',
  PAID: 'bg-success/15 text-success',
  PENDING: 'bg-gold/20 text-warn',
  UNPAID: 'bg-gold/20 text-warn',
  PROCESSING: 'bg-gold/20 text-warn',
  CONFIRMED: 'bg-primary/15 text-primary',
  SHIPPED: 'bg-primary/15 text-primary',
  SUSPENDED: 'bg-sale/15 text-sale',
  CANCELLED: 'bg-sale/15 text-sale',
  RETURNED: 'bg-sale/15 text-sale',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${MAP[status] ?? 'bg-ink/10 text-ink'}`}>{status}</span>;
}
