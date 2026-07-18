import Link from 'next/link';
import { getT } from '@/i18n/server';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:5174';

export async function Footer() {
  const t = await getT();
  return (
    <footer className="mt-16 border-t border-ink/10 bg-sand/50">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-display text-xl font-bold">
            Boutique<span className="text-primary">BD</span>
          </p>
          <p className="text-sm text-muted">{t('footer.tagline')}</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">{t('footer.shop')}</p>
          <Link href="/products" className="block text-muted hover:text-primary">
            {t('footer.allProducts')}
          </Link>
          <Link href="/products?sort=price_asc" className="block text-muted hover:text-primary">
            {t('footer.bestValue')}
          </Link>
          <Link href="/track" className="block text-muted hover:text-primary">
            {t('nav.track')}
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">{t('footer.help')}</p>
          <Link href="/about" className="block text-muted hover:text-primary">
            {t('footer.about')}
          </Link>
          <Link href="/contact" className="block text-muted hover:text-primary">
            {t('footer.contact')}
          </Link>
          <Link href="/faq" className="block text-muted hover:text-primary">
            {t('footer.faq')}
          </Link>
          <Link href="/returns" className="block text-muted hover:text-primary">
            {t('footer.returns')}
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">{t('footer.sell')}</p>
          <p className="text-muted">{t('footer.sellDesc')}</p>
          <a
            href={`${DASHBOARD_URL}/signup`}
            className="inline-block rounded-full bg-ink px-3 py-1 text-xs text-white transition hover:bg-primary"
          >
            {t('footer.sell')} →
          </a>
        </div>
      </div>
      <div className="border-t border-ink/10 py-4">
        <p className="container-x text-xs text-muted">
          © {new Date().getFullYear()} Boutique BD. {t('footer.hygiene')}
        </p>
      </div>
    </footer>
  );
}
