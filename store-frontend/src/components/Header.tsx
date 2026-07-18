import Link from 'next/link';
import { CartButton } from './CartButton';
import { SearchBar } from './SearchBar';
import { LanguageToggle } from './LanguageToggle';
import { getT } from '@/i18n/server';

export async function Header() {
  const t = await getT();
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas/90 backdrop-blur">
      <div className="container-x flex items-center gap-4 py-4">
        <Link href="/" className="font-display text-2xl font-bold text-ink">
          Boutique<span className="text-primary">BD</span>
        </Link>

        <div className="hidden flex-1 px-4 md:block">
          <SearchBar />
        </div>

        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/products" className="hidden text-ink hover:text-primary sm:inline">
            {t('nav.shop')}
          </Link>
          <Link href="/track" className="hidden text-ink hover:text-primary sm:inline">
            {t('nav.track')}
          </Link>
          <LanguageToggle />
          <CartButton />
        </nav>
      </div>

      <div className="border-t border-ink/5 px-4 py-2 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
