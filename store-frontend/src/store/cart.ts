'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  image?: string;
  shopSlug: string;
  shopName: string;
  variantId?: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
  stockQty?: number;
}

export const cartKey = (i: { productId: string; variantId?: string }): string =>
  `${i.productId}:${i.variantId ?? ''}`;

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const k = cartKey(item);
          const existing = s.items.find((i) => cartKey(i) === k);
          if (existing) {
            return {
              items: s.items.map((i) =>
                cartKey(i) === k ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { items: [...s.items, item] };
        }),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => cartKey(i) !== key) })),
      setQty: (key, qty) =>
        set((s) => ({
          items: s.items.map((i) => (cartKey(i) === key ? { ...i, quantity: Math.max(1, qty) } : i)),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'boutique-cart' },
  ),
);
