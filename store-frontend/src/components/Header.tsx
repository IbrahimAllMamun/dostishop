import Link from 'next/link';
import { CartButton } from './CartButton';
import { SearchBar } from './SearchBar';
import { LanguageToggle } from './LanguageToggle';
import { MenuDrawer } from './MenuDrawer';
import { WishlistButton } from './WishlistButton';
import { getCategories } from '@/lib/api';
import { getT } from '@/i18n/server';

export async function Header() {
  const [t, categories] = await Promise.all([getT(), getCategories().catch(() => [])]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas/90 backdrop-blur">
      <div className="container-x flex items-center gap-2 py-3 sm:gap-4">
        <MenuDrawer categories={categories} />

        <Link href="/" className="font-display text-xl font-bold text-ink sm:text-2xl">
          Boutique<span className="text-primary">BD</span>
        </Link>

        <div className="hidden flex-1 px-4 md:block">
          <SearchBar />
        </div>

        <nav className="ml-auto flex items-center gap-3 text-sm sm:gap-4">
          <Link href="/products" className="hidden text-ink hover:text-primary md:inline">
            {t('nav.shop')}
          </Link>
          <Link href="/track" className="hidden text-ink hover:text-primary md:inline">
            {t('nav.track')}
          </Link>
          <span className="hidden sm:inline-flex">
            <LanguageToggle />
          </span>
          <WishlistButton />
          <CartButton />
        </nav>
      </div>

      <div className="border-t border-ink/5 px-4 py-2 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
