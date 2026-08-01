import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { TableSkeleton } from '@/components/Skeleton';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Shops</h1>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`badge ${filter === f ? 'bg-ink text-white' : 'bg-sand text-ink'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/5">
              <th className="th">Shop</th>
              <th className="th">Owner</th>
              <th className="th">Commission</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={5} />
            ) : shops.length === 0 ? (
              <tr>
                <td className="td text-muted-foreground" colSpan={5}>
                  No shops.
                </td>
              </tr>
            ) : (
              shops.map((s) => (
                <tr key={s.id} className="border-b border-ink/5 last:border-0">
                  <td className="td">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">/{s.slug}</div>
                  </td>
                  <td className="td">
                    <div>{s.owner?.name}</div>
                    <div className="text-xs text-muted-foreground">{s.owner?.email}</div>
                  </td>
                  <td className="td">{s.commissionRate ? `${Number(s.commissionRate)}%` : '—'}</td>
                  <td className="td">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="td">
                    <div className="flex gap-2">
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
