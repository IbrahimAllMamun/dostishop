import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink/10 bg-sand/50">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-display text-xl font-bold">
            Boutique<span className="text-primary">BD</span>
          </p>
          <p className="text-sm text-muted">
            Bags, jewelry, cosmetics, clothing & footwear from trusted local shops. Cash on delivery
            across Bangladesh.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">Shop</p>
          <Link href="/products" className="block text-muted hover:text-primary">
            All products
          </Link>
          <Link href="/products?sort=price_asc" className="block text-muted hover:text-primary">
            Best value
          </Link>
          <Link href="/track" className="block text-muted hover:text-primary">
            Track order
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">Help</p>
          <p className="text-muted">Delivery in 2–5 days</p>
          <p className="text-muted">Cash on delivery</p>
          <p className="text-muted">Easy returns*</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">Sell with us</p>
          <p className="text-muted">Own a shop? List your products and reach customers nationwide.</p>
          <span className="inline-block rounded-full bg-ink px-3 py-1 text-xs text-white">
            Vendor portal coming soon
          </span>
        </div>
      </div>
      <div className="border-t border-ink/10 py-4">
        <p className="container-x text-xs text-muted">
          © {new Date().getFullYear()} Boutique BD. *Cosmetics & pierced jewelry are non-returnable
          for hygiene.
        </p>
      </div>
    </footer>
  );
}
