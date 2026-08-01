/** Streamed instantly while the product is fetched. Matches ProductDetail's
 *  two-column layout so the real content lands in place without shifting. */
export default function ProductLoading() {
  return (
    <div className="container-x grid gap-10 py-8 lg:grid-cols-2">
      {/* gallery */}
      <div className="space-y-3">
        <div className="skeleton aspect-square w-full rounded-3xl" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 w-20" />
          ))}
        </div>
      </div>

      {/* buy box */}
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-10 w-4/5" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="skeleton h-8 w-40" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-2/3" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-20 rounded-full" />
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <div className="skeleton h-12 w-36 rounded-full" />
          <div className="skeleton h-12 w-32 rounded-full" />
        </div>
        <div className="skeleton h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
