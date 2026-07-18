'use client';
import { createContext, useContext } from 'react';
import { translate, type DictKey, type Locale } from './dict';

const LocaleContext = createContext<Locale>('en');

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Client-side translator hook. */
export function useT(): (key: DictKey) => string {
  const locale = useContext(LocaleContext);
  return (key) => translate(locale, key);
}
