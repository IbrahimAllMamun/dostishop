'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, cartKey } from '@/store/cart';
import { formatTk } from '@/lib/format';
import { useHasHydrated } from '@/lib/useHasHydrated';

export default function CartPage() {
  const hydrated = useHasHydrated();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const subtotal = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);

  if (!hydrated) {
    return <div className="container-x py-20 text-center text-muted">Loading cart…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted">Find something you love.</p>
        <Link href="/products" className="btn-primary mt-6">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-x grid gap-8 py-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h1 className="font-display text-3xl font-bold">Cart</h1>
        {items.map((i) => {
          const k = cartKey(i);
          return (
            <div key={k} className="card flex gap-4 p-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-sand">
                {i.image && (
                  <Image src={i.image} alt={i.name} fill sizes="96px" className="object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-2">
                  <div>
                    <Link href={`/product/${i.slug}`} className="font-medium hover:text-primary">
                      {i.name}
                    </Link>
                    {i.variantLabel && <p className="text-sm text-muted">{i.variantLabel}</p>}
                    <p className="text-xs uppercase tracking-wide text-muted">{i.shopName}</p>
                  </div>
                  <button
                    onClick={() => remove(k)}
                    className="text-sm text-muted hover:text-sale"
                    aria-label="Remove item"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border border-ink/15">
                    <button onClick={() => setQty(k, i.quantity - 1)} className="px-3 py-1.5">
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{i.quantity}</span>
                    <button onClick={() => setQty(k, i.quantity + 1)} className="px-3 py-1.5">
                      +
                    </button>
                  </div>
                  <span className="font-semibold">{formatTk(i.unitPrice * i.quantity)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="card sticky top-28 space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-medium">{formatTk(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Shipping</span>
            <span className="text-muted">Calculated at checkout</span>
          </div>
          <Link href="/checkout" className="btn-primary w-full">
            Checkout
          </Link>
          <Link href="/products" className="block text-center text-sm text-primary hover:underline">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
