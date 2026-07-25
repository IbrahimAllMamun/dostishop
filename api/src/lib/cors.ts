import { corsOrigins } from '../config/env';

/** Builds matchers from CORS_ORIGIN entries. Entries may contain `*`, which
 *  matches one hostname segment (letters/digits/hyphens) — e.g.
 *  `https://store-front-*-mimamun.vercel.app` matches every Vercel deployment
 *  URL of that project. */
const matchers = corsOrigins.map((entry) => {
  if (!entry.includes('*')) {
    return (origin: string) => origin === entry;
  }
  const pattern = entry
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape regex chars (not *)
    .replace(/\*/g, '[a-z0-9-]+');
  const rx = new RegExp(`^${pattern}$`, 'i');
  return (origin: string) => rx.test(origin);
});

export function isAllowedOrigin(origin: string | undefined): boolean {
  // Non-browser clients (curl, server-to-server, health checks) send no Origin
  if (!origin) return true;
  return matchers.some((m) => m(origin));
}
