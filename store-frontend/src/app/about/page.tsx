export const metadata = { title: 'About us' };

export default function AboutPage() {
  return (
    <div className="container-x max-w-3xl space-y-6 py-12">
      <h1 className="font-display text-4xl font-bold">About Boutique BD</h1>
      <p className="leading-relaxed text-ink/80">
        Boutique BD is a multi-vendor marketplace bringing together trusted local shops selling
        backpacks, purses, imitation jewelry, cosmetics, clothing and footwear — all in one place,
        with cash on delivery across Bangladesh.
      </p>
      <p className="leading-relaxed text-ink/80">
        Every shop on Boutique BD is independently owned and reviewed before going live. When you
        order, each shop packs and ships its own items, so you get products straight from the source
        at fair prices.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { t: 'Cash on delivery', d: 'Pay when your order arrives — nationwide.' },
          { t: 'Curated shops', d: 'Every vendor is vetted before they can sell.' },
          { t: 'Fast delivery', d: 'Typically 2–5 days depending on your area.' },
        ].map((x) => (
          <div key={x.t} className="card p-5">
            <p className="font-semibold">{x.t}</p>
            <p className="mt-1 text-sm text-muted">{x.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
