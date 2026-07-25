'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buildCategoryTree, type Category } from '@/lib/types';
import { useT } from '@/i18n/I18nProvider';
import { LanguageToggle } from './LanguageToggle';

export function MenuDrawer({ categories }: { categories: Category[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => setOpen(false);
  const tree = buildCategoryTree(categories);

  const MENU_LINKS: Array<{ href: string; label: string }> = [
    { href: '/products', label: t('footer.allProducts') },
    { href: '/track', label: t('nav.track') },
    { href: '/about', label: t('footer.about') },
    { href: '/contact', label: t('footer.contact') },
    { href: '/faq', label: t('footer.faq') },
    { href: '/returns', label: t('footer.returns') },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('nav.openMenu')}
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-sand"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] transform flex-col bg-canvas shadow-2xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <span className="font-display text-xl font-bold">
            Boutique<span className="text-primary">BD</span>
          </span>
          <button
            onClick={close}
            aria-label={t('nav.close')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-sand hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Categories */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('nav.categories')}
          </p>
          <nav className="mb-6">
            {tree.map((cat) => (
              <div key={cat.id} className="border-b border-ink/5 last:border-0">
                <div className="flex items-center">
                  <Link
                    href={`/products?category=${cat.slug}`}
                    onClick={close}
                    className="flex-1 py-2.5 text-sm font-medium text-ink hover:text-primary"
                  >
                    {cat.name}
                  </Link>
                  {cat.children.length > 0 && (
                    <button
                      onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                      aria-label={`${cat.name} subcategories`}
                      className={`flex h-8 w-8 items-center justify-center text-muted transition ${
                        expanded === cat.id ? 'rotate-180 text-primary' : ''
                      }`}
                    >
                      ▾
                    </button>
                  )}
                </div>
                {expanded === cat.id && cat.children.length > 0 && (
                  <div className="pb-2 pl-4">
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/products?category=${sub.slug}`}
                        onClick={close}
                        className="block py-1.5 text-sm text-muted hover:text-primary"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Menu */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('nav.menu')}
          </p>
          <nav className="space-y-0.5">
            {MENU_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                className="block py-2 text-sm text-ink hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-ink/10 px-5 py-4">
          <LanguageToggle />
        </div>
      </aside>
    </>
  );
}
