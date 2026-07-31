import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/format';
import type { Review } from '@/lib/types';

const FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const;

function StarsInline({ n }: { n: number }) {
  return (
    <span className="text-gold">
      {'★'.repeat(n)}
      <span className="text-ink/15">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('PENDING');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = filter === 'ALL' ? '' : `?status=${filter}`;
    api
      .get<{ reviews: Review[] }>(`/reviews/admin${q}`)
      .then((d) => setReviews(d.reviews))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(load, [load]);

  async function setStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    setBusy(id);
    try {
      await api.patch(`/reviews/admin/${id}`, { status });
      setReviews((rs) => rs.filter((r) => r.id !== id || filter === 'ALL'));
      if (filter === 'ALL') load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this review permanently?')) return;
    await api.del(`/reviews/admin/${id}`);
    setReviews((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reviews</h1>
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

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">No {filter.toLowerCase()} reviews.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StarsInline n={r.rating} />
                <span className="font-medium">{r.customerName}</span>
                <span className="text-xs text-muted-foreground">{r.phone}</span>
                {r.isVerified && (
                  <span className="badge bg-success/15 text-success">✓ Verified</span>
                )}
                <StatusBadge status={r.status} />
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                On: <span className="font-medium text-ink">{r.product?.name}</span>
                {r.orderNo && <span> · order {r.orderNo}</span>}
              </p>
              {r.comment && <p className="mt-2 text-sm text-ink/80">{r.comment}</p>}
              {r.photos.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.photos.map((p) => (
                    <img key={p.id} src={p.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2 border-t border-ink/5 pt-3">
                {r.status !== 'APPROVED' && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => setStatus(r.id, 'APPROVED')}
                    className="btn-primary btn-sm"
                  >
                    Approve
                  </button>
                )}
                {r.status !== 'REJECTED' && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => setStatus(r.id, 'REJECTED')}
                    className="btn-ghost btn-sm"
                  >
                    Reject
                  </button>
                )}
                <button
                  onClick={() => remove(r.id)}
                  className="btn-sm ml-auto text-muted-foreground hover:text-sale"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
