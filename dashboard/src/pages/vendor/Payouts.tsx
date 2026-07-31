import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTk, formatDate } from '@/lib/format';
import type { Payout } from '@/lib/types';

export function VendorPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ payouts: Payout[] }>('/payouts/mine')
      .then((d) => setPayouts(d.payouts))
      .finally(() => setLoading(false));
  }, []);

  const pending = payouts.filter((p) => p.status === 'PENDING').reduce((n, p) => n + Number(p.net), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Settlements for your delivered orders.
          {pending > 0 && (
            <>
              {' '}
              <span className="font-medium text-warn">{formatTk(pending)} pending payment.</span>
            </>
          )}
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/5">
              <th className="th">Created</th>
              <th className="th">Period</th>
              <th className="th">Orders</th>
              <th className="th">Gross</th>
              <th className="th">Commission</th>
              <th className="th">Net</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="td text-muted-foreground" colSpan={7}>
                  Loading…
                </td>
              </tr>
            ) : payouts.length === 0 ? (
              <tr>
                <td className="td text-muted-foreground" colSpan={7}>
                  No payouts yet — they appear once your delivered orders are settled by the platform.
                </td>
              </tr>
            ) : (
              payouts.map((p) => (
                <tr key={p.id} className="border-b border-ink/5 last:border-0">
                  <td className="td whitespace-nowrap text-muted-foreground">{formatDate(p.createdAt)}</td>
                  <td className="td whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(p.periodFrom)} → {formatDate(p.periodTo)}
                  </td>
                  <td className="td">{p._count?.subOrders ?? '—'}</td>
                  <td className="td">{formatTk(p.gross)}</td>
                  <td className="td text-muted-foreground">−{formatTk(p.commission)}</td>
                  <td className="td font-semibold">{formatTk(p.net)}</td>
                  <td className="td">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
