import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { formatTk } from '@/lib/format';
import { useDialogs } from '@/components/Dialogs';
import type { Shop } from '@/lib/types';

const FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'] as const;

export function AdminShops() {
  const { confirm, notify } = useDialogs();
  const [shops, setShops] = useState<Shop[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = filter === 'ALL' ? '' : `?status=${filter}`;
    api
      .get<{ shops: Shop[] }>(`/shops/admin${q}`)
      .then((d) => setShops(d.shops))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(load, [load]);

  async function setStatus(id: string, status: Shop['status']) {
    setBusy(id);
    try {
      await api.patch(`/shops/admin/${id}/status`, { status });
      load();
    } catch (e) {
      await notify({
        title: 'Could not change the shop status',
        description: e instanceof Error ? e.message : 'Failed',
        tone: 'danger',
      });
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword(shop: Shop) {
    if (!shop.owner) return;
    const ok = await confirm({
      title: 'Reset this vendor’s password?',
      description: `${shop.owner.email} will be signed out and can only get back in with the temporary password shown next.`,
      confirmLabel: 'Reset password',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const res = await api.post<{ tempPassword: string }>('/auth/admin/reset-password', {
        userId: shop.owner.id,
      });
      await notify({
        title: 'Temporary password',
        description: `Share this with ${shop.owner.email}. It is shown once — copy it now.`,
        value: res.tempPassword,
      });
    } catch (e) {
      await notify({
        title: 'Could not reset the password',
        description: e instanceof Error ? e.message : 'Failed',
        tone: 'danger',
      });
    }
  }

  const columns: Column<Shop>[] = [
    {
      key: 'name',
      header: 'Shop',
      sortable: true,
      value: (s) => s.name,
      render: (s) => (
        <>
          <div className="font-medium">{s.name}</div>
          <div className="text-xs text-muted-foreground">/{s.slug}</div>
        </>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      sortable: true,
      value: (s) => s.owner?.name ?? '',
      render: (s) => (
        <>
          <div>{s.owner?.name}</div>
          <div className="text-xs text-muted-foreground">{s.owner?.email}</div>
        </>
      ),
    },
    {
      key: 'commission',
      header: 'Commission',
      sortable: true,
      value: (s) => (s.commissionRate ? Number(s.commissionRate) : 0),
      render: (s) => (s.commissionRate ? `${Number(s.commissionRate)}%` : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      value: (s) => s.status,
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <div className="flex flex-wrap gap-2">
          {s.status !== 'ACTIVE' && (
            <button
              disabled={busy === s.id}
              onClick={() => setStatus(s.id, 'ACTIVE')}
              className="btn-primary btn-sm"
            >
              Approve
            </button>
          )}
          {s.status !== 'SUSPENDED' && (
            <button
              disabled={busy === s.id}
              onClick={() => setStatus(s.id, 'SUSPENDED')}
              className="btn-ghost btn-sm"
            >
              Suspend
            </button>
          )}
          <button
            onClick={() => resetPassword(s)}
            className="btn-ghost btn-sm"
            title="Generate a temporary password for the owner"
          >
            Reset pw
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Shops</h1>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`badge transition-[background-color,color,transform] duration-200 ease-out active:scale-95 ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-sand text-ink hover:bg-ink/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={shops}
        getRowId={(s) => s.id}
        loading={loading}
        searchPlaceholder="Search shops or owners…"
        empty="No shops."
      />
    </div>
  );
}
