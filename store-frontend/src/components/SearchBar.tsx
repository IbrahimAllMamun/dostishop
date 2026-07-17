'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/products?search=${encodeURIComponent(term)}` : '/products');
  }

  return (
    <form onSubmit={submit} className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search bags, jewelry, cosmetics…"
        className="input py-2.5"
        aria-label="Search products"
      />
    </form>
  );
}
