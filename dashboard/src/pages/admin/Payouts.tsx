import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
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

  const columns: Column<Payout>[] = [
    {
      key: 'shop',
      header: 'Shop',
      sortable: true,
      value: (p) => p.shop?.name ?? '',
      render: (p) => <span className="font-medium">{p.shop?.name}</span>,
    },
    {
      key: 'period',
      header: 'Period',
      sortable: true,
      value: (p) => p.periodFrom,
      className: 'whitespace-nowrap text-xs text-muted-foreground',
      render: (p) => `${formatDate(p.periodFrom)} → ${formatDate(p.periodTo)}`,
    },
    {
      key: 'orders',
      header: 'Orders',
      sortable: true,
      value: (p) => p._count?.subOrders ?? 0,
      render: (p) => p._count?.subOrders ?? '—',
    },
    {
      key: 'gross',
      header: 'Gross',
      sortable: true,
      value: (p) => Number(p.gross),
      render: (p) => formatTk(p.gross),
    },
    {
      key: 'commission',
      header: 'Commission',
      sortable: true,
      value: (p) => Number(p.commission),
      className: 'text-muted-foreground',
      render: (p) => formatTk(p.commission),
    },
    {
      key: 'net',
      header: 'Net payable',
      sortable: true,
      value: (p) => Number(p.net),
      render: (p) => <span className="font-semibold">{formatTk(p.net)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      value: (p) => p.status,
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (p) =>
        p.status === 'PENDING' ? (
          <button onClick={() => markPaid(p.id)} className="btn-primary btn-sm">
            Mark paid
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Vendor payouts</h1>
          <p className="text-sm text-muted-foreground">
            Bundles every delivered, unsettled sub-order into one payout per shop.
          </p>
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? 'Generating…' : 'Generate payouts'}
        </button>
      </div>

      {msg && <div className="rounded-lg bg-sand/70 px-4 py-2 text-sm">{msg}</div>}

      <DataTable
        columns={columns}
        rows={payouts}
        getRowId={(p) => p.id}
        loading={loading}
        searchPlaceholder="Search shops…"
        empty="No payouts yet. Mark sub-orders DELIVERED, then generate."
      />
    </div>
  );
}
