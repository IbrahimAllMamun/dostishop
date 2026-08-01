/** Maps a domain status onto one of the badge variants in index.css, so every
 *  status inherits the contrast-checked `-strong` foregrounds rather than
 *  hand-rolling a tint per call site. */
const MAP: Record<string, string> = {
  ACTIVE: 'badge-success',
  DELIVERED: 'badge-success',
  PAID: 'badge-success',
  RECOVERED: 'badge-success',
  OPEN: 'badge-warn',
  DISMISSED: 'badge-neutral',
  PENDING: 'badge-warn',
  UNPAID: 'badge-warn',
  PROCESSING: 'badge-warn',
  CONFIRMED: 'badge-info',
  SHIPPED: 'badge-info',
  SUSPENDED: 'badge-danger',
  CANCELLED: 'badge-danger',
  RETURNED: 'badge-danger',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={MAP[status] ?? 'badge-neutral'}>{status}</span>;
}
