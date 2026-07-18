import { getProductReviews } from '@/lib/api';
import { Stars } from './Stars';
import { ReviewForm } from './ReviewForm';
import { getT } from '@/i18n/server';

export async function ReviewsSection({ productId }: { productId: string }) {
  const t = await getT();
  const { reviews, stats } = await getProductReviews(productId).catch(() => ({
    reviews: [],
    stats: { avg: 0, count: 0, distribution: {} as Record<number, number> },
  }));

  return (
    <section className="container-x space-y-6 py-10" id="reviews">
      <h2 className="font-display text-2xl font-semibold">{t('product.reviews')}</h2>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Summary */}
        <div className="space-y-4">
          {stats.count > 0 ? (
            <>
              <div className="flex items-end gap-3">
                <span className="font-display text-5xl font-bold">{stats.avg.toFixed(1)}</span>
                <div>
                  <Stars value={stats.avg} className="text-lg" />
                  <p className="text-sm text-muted">{stats.count} review{stats.count > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = stats.distribution[star] ?? 0;
                  const pct = stats.count ? Math.round((n / stats.count) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs text-muted">
                      <span className="w-3">{star}</span>
                      <span className="text-gold">★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right">{n}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-muted">{t('product.noReviews')}</p>
          )}
          <ReviewForm productId={productId} />
        </div>

        {/* List */}
        <div className="space-y-4 lg:col-span-2">
          {reviews.map((r) => (
            <div key={r.id} className="card space-y-2 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                <span className="font-medium">{r.customerName}</span>
                {r.isVerified && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    {t('product.verified')}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.comment && <p className="text-sm leading-relaxed text-ink/80">{r.comment}</p>}
              {r.photos.length > 0 && (
                <div className="flex gap-2 pt-1">
                  {r.photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.url}
                      src={p.url}
                      alt="Customer photo"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
