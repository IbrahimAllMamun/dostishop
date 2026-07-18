import { cookies } from 'next/headers';
import { translate, type DictKey, type Locale } from './dict';

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get('locale')?.value;
  return c === 'bn' ? 'bn' : 'en';
}

/** Server-side translator for server components. */
export async function getT(): Promise<(key: DictKey) => string> {
  const locale = await getLocale();
  return (key) => translate(locale, key);
}
