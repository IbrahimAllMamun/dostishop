import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTk, formatDate } from '@/lib/format';
import type { Payout } from '@/lib/types';

export function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    api
      .get<{ payouts: Payout[] }>('/payouts/admin')
      .then((d) => setPayouts(d.payouts))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function generate() {
    setGenerating(true);
    setMsg(null);
    try {
      const res = await api.post<{ message: string }>('/payouts/admin/generate');
      setMsg(res.message);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setGenerating(false);
    }
  }

  async function markPaid(id: string) {
    await api.patch(`/payouts/admin/${id}/paid`);
    setPayouts((ps) => ps.map((p) => (p.id === id ? { ...p, status: 'PAID' } : p)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Vendor payouts</h1>
          <p className="text-sm text-muted">
            Bundles every delivered, unsettled sub-order into one payout per shop.
          </p>
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? 'Generating…' : 'Generate payouts'}
        </button>
      </div>

      {msg && <div className="rounded-lg bg-sand/70 px-4 py-2 text-sm">{msg}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/5">
              <th className="th">Shop</th>
              <th className="th">Period</th>
              <th className="th">Orders</th>
              <th className="th">Gross</th>
              <th className="th">Commission</th>
              <th className="th">Net payable</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="td text-muted" colSpan={8}>
                  Loading…
                </td>
              </tr>
            ) : payouts.length === 0 ? (
              <tr>
                <td className="td text-muted" colSpan={8}>
                  No payouts yet. Mark sub-orders DELIVERED, then generate.
                </td>
              </tr>
            ) : (
              payouts.map((p) => (
                <tr key={p.id} className="border-b border-ink/5 last:border-0">
                  <td className="td font-medium">{p.shop?.name}</td>
                  <td className="td whitespace-nowrap text-xs text-muted">
                    {formatDate(p.periodFrom)} → {formatDate(p.periodTo)}
                  </td>
                  <td className="td">{p._count?.subOrders ?? '—'}</td>
                  <td className="td">{formatTk(p.gross)}</td>
                  <td className="td text-muted">{formatTk(p.commission)}</td>
                  <td className="td font-semibold">{formatTk(p.net)}</td>
                  <td className="td">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="td">
                    {p.status === 'PENDING' && (
                      <button onClick={() => markPaid(p.id)} className="btn-primary btn-sm">
                        Mark paid
                      </button>
                    )}
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
