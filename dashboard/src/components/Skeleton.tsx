/** Loading placeholders. Replaces bare "Loading…" text so the shape of the
 *  incoming content is visible immediately and nothing shifts when it lands. */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Rows shaped like the table they're standing in for. */
export function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-ink/5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="td">
              <Skeleton className={`h-4 ${c === 0 ? 'w-32' : c === cols - 1 ? 'w-16' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Stat tiles above a dashboard. */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-2 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Stacked cards (orders, reviews, abandoned carts). */
export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
