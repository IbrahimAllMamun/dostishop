'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSuggestions, type Suggestion } from '@/lib/api';
import { formatTk } from '@/lib/format';
import { useT } from '@/i18n/I18nProvider';

export function SearchBar() {
  const t = useT();
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);

  // Debounced autocomplete
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      getSuggestions(term)
        .then((s) => {
          setSuggestions(s);
          setOpen(true);
        })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    const term = q.trim();
    router.push(term ? `/products?search=${encodeURIComponent(term)}` : '/products');
  }

  return (
    <div ref={boxRef} className="relative">
      <form onSubmit={submit}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          placeholder={t('nav.searchPlaceholder')}
          className="input py-2.5"
          aria-label="Search products"
        />
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl bg-surface shadow-lg ring-1 ring-ink/10">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/product/${s.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 transition hover:bg-sand/50"
            >
              {s.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-sand" />
              )}
              <span className="flex-1 truncate text-sm">{s.name}</span>
              <span className="text-sm font-medium">{formatTk(s.price)}</span>
            </Link>
          ))}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
              router.push(`/products?search=${encodeURIComponent(q.trim())}`);
            }}
            className="w-full border-t border-ink/5 px-3 py-2 text-left text-sm text-primary hover:bg-sand/50"
          >
            See all results for “{q.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
