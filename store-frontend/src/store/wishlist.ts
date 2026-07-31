'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishItem {
  productId: string;
  slug: string;
  name: string;
  image?: string;
  price: number;
  shopName?: string;
}

interface WishState {
  items: WishItem[];
  toggle: (item: WishItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useWishlist = create<WishState>()(
  persist(
    (set) => ({
      items: [],
      toggle: (item) =>
        set((s) =>
          s.items.some((i) => i.productId === item.productId)
            ? { items: s.items.filter((i) => i.productId !== item.productId) }
            : { items: [...s.items, item] },
        ),
      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'boutique-wishlist' },
  ),
);
