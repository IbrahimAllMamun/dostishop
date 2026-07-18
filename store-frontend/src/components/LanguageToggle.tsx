'use client';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/I18nProvider';

export function LanguageToggle() {
  const router = useRouter();
  const locale = useLocale();
  const next = locale === 'en' ? 'bn' : 'en';

  function toggle() {
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-ink"
      aria-label={next === 'bn' ? 'বাংলায় দেখুন' : 'Switch to English'}
    >
      {next === 'bn' ? 'বাংলা' : 'EN'}
    </button>
  );
}
