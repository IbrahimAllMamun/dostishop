import type { Metadata } from 'next';
import { Fraunces, Hind_Siliguri, Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { I18nProvider } from '@/i18n/I18nProvider';
import { getLocale } from '@/i18n/server';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const bangla = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bangla',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Boutique BD — Bags, Jewelry, Cosmetics & More',
    template: '%s · Boutique BD',
  },
  description:
    'Shop backpacks, purses, imitation jewelry, cosmetics, clothing and footwear from trusted local shops. Cash on delivery across Bangladesh.',
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Boutique BD',
  url: SITE,
  description:
    'Multi-vendor marketplace for bags, jewelry, cosmetics, clothing and footwear in Bangladesh.',
  areaServed: 'BD',
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Boutique BD',
  url: SITE,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/products?search={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${bangla.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {/* Without JS the IntersectionObserver never fires, so unhide everything. */}
        <noscript>
          {/* eslint-disable-next-line react/no-danger */}
          <style dangerouslySetInnerHTML={{ __html: '.reveal{opacity:1!important}' }} />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <I18nProvider locale={locale}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppButton />
        </I18nProvider>
      </body>
    </html>
  );
}
