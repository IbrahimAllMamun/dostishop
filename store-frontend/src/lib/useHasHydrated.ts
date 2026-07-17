'use client';
import { useEffect, useState } from 'react';

/** Returns false during SSR and the first client render, true after mount.
 *  Used to avoid hydration mismatches for localStorage-backed state (cart). */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
