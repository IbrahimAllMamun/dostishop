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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${bangla.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
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
