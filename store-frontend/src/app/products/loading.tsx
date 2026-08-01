/** Streamed instantly while the product list is fetched.
 *  Mirrors the real layout so nothing shifts when data lands (CLS). */
export default function ProductsLoading() {
  return (
    <div className="container-x space-y-6 py-8">
      <div className="space-y-2">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton h-4 w-28" />
      </div>

      {/* category pills */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* filter sidebar */}
        <div className="hidden space-y-5 lg:block">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>

        {/* product grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton aspect-square w-full" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
