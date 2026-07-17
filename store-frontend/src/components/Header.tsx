import Link from 'next/link';
import { getCategories } from '@/lib/api';
import { CartButton } from './CartButton';
import { SearchBar } from './SearchBar';

export async function Header() {
  const categories = await getCategories().catch(() => []);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas/90 backdrop-blur">
      <div className="container-x flex items-center gap-4 py-4">
        <Link href="/" className="font-display text-2xl font-bold text-ink">
          Boutique<span className="text-primary">BD</span>
        </Link>

        <div className="hidden flex-1 px-4 md:block">
          <SearchBar />
        </div>

        <nav className="ml-auto flex items-center gap-5 text-sm">
          <Link href="/track" className="hidden text-ink hover:text-primary sm:inline">
            Track order
          </Link>
          <CartButton />
        </nav>
      </div>

      <div className="border-t border-ink/5">
        <div className="container-x flex gap-5 overflow-x-auto py-2 text-sm text-muted">
          <Link href="/products" className="whitespace-nowrap font-medium hover:text-primary">
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className="whitespace-nowrap hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-ink/5 px-4 py-2 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
