'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/store/cart';
import { formatTk } from '@/lib/format';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { getSettings, postCheckout, sendCheckoutIntent, validateCoupon } from '@/lib/api';
import { useT } from '@/i18n/I18nProvider';
import type { Order, Settings } from '@/lib/types';

type Zone = 'inside_dhaka' | 'outside_dhaka';

export default function CheckoutPage() {
  const t = useT();
  const hydrated = useHasHydrated();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [zone, setZone] = useState<Zone>('inside_dhaka');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Order | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Dhaka',
    note: '',
  });

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  // One key per checkout session — the API ignores duplicate submissions
  const idempotencyKey = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  // Abandoned-checkout capture: once a plausible phone is typed, record the
  // intent (debounced). If the order is placed, the API marks it recovered.
  const intentSent = useRef(false);
  useEffect(() => {
    const phone = form.phone.replace(/\D/g, '');
    if (intentSent.current || phone.length < 11 || items.length === 0) return;
    const t = setTimeout(() => {
      intentSent.current = true;
      sendCheckoutIntent({
        customerName: form.customerName || undefined,
        phone: form.phone,
        items: items.map((i) => ({
          name: i.variantLabel ? `${i.name} (${i.variantLabel})` : i.name,
          qty: i.quantity,
          price: i.unitPrice,
        })),
        subtotal: items.reduce((n, i) => n + i.unitPrice * i.quantity, 0),
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [form.phone, form.customerName, items]);

  const shopCount = useMemo(() => new Set(items.map((i) => i.shopSlug)).size, [items]);
  const subtotal = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
  const perShopShipping =
    zone === 'inside_dhaka'
      ? Number(settings?.shippingInsideDhaka ?? 60)
      : Number(settings?.shippingOutsideDhaka ?? 120);
  const shipping = perShopShipping * (shopCount || 1);
  const discount = coupon?.discount ?? 0;
  const grand = Math.max(0, subtotal + shipping - discount);

  async function applyCoupon() {
    setCouponError(null);
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    try {
      const result = await validateCoupon(couponInput.trim(), subtotal);
      setCoupon(result);
    } catch (err) {
      setCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon');
    } finally {
      setApplyingCoupon(false);
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const order = await postCheckout({
        customerName: form.customerName,
        phone: form.phone,
        email: form.email || undefined,
        address: form.address,
        city: form.city,
        zone,
        note: form.note || undefined,
        couponCode: coupon?.code,
        idempotencyKey: idempotencyKey.current,
        paymentMethod: 'COD',
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });
      setPlaced(order);
      clear();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <div className="container-x py-20 text-center text-muted">Loading…</div>;
  }

  // Success screen
  if (placed) {
    return (
      <div className="container-x max-w-2xl py-12">
        <div className="card space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
            ✓
          </div>
          <h1 className="font-display text-3xl font-bold">{t('checkout.placed')}</h1>
          <p className="text-muted">
            Your order number is{' '}
            <span className="font-semibold text-ink">{placed.orderNo}</span>. We’ll call{' '}
            <span className="font-medium text-ink">{placed.phone}</span> to confirm.
          </p>

          <div className="space-y-2 rounded-2xl bg-sand/60 p-4 text-left text-sm">
            {placed.subOrders.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span>{s.shop?.name ?? 'Shop'}</span>
                <span className="font-medium">{formatTk(s.subtotal)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-ink/10 pt-2">
              <span>Shipping</span>
              <span>{formatTk(placed.shippingTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total (Cash on delivery)</span>
              <span>{formatTk(placed.grandTotal)}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Link href={`/track?orderNo=${placed.orderNo}`} className="btn-outline">
              {t('nav.track')}
            </Link>
            <Link href="/products" className="btn-primary">
              {t('checkout.keepShopping')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-3xl font-bold">{t('cart.empty')}</h1>
        <Link href="/products" className="btn-primary mt-6">
          {t('cart.startShopping')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="container-x grid gap-8 py-8 lg:grid-cols-3">
      {/* Details */}
      <div className="space-y-5 lg:col-span-2">
        <h1 className="font-display text-3xl font-bold">{t('checkout.title')}</h1>

        {error && (
          <div className="rounded-xl bg-sale/10 px-4 py-3 text-sm text-sale">{error}</div>
        )}

        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium">{t('checkout.fullName')}</span>
              <input
                required
                className="input"
                value={form.customerName}
                onChange={(e) => update('customerName', e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">{t('checkout.phone')}</span>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="input"
                placeholder="01XXXXXXXXX"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-sm font-medium">{t('checkout.address')}</span>
            <textarea
              required
              rows={3}
              className="input"
              placeholder={t('checkout.addressPh')}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium">{t('checkout.city')}</span>
              <input
                required
                className="input"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">{t('checkout.email')}</span>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </label>
          </div>

          {/* Zone */}
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('checkout.deliveryArea')}</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['inside_dhaka', t('checkout.insideDhaka'), settings?.shippingInsideDhaka ?? 60],
                  ['outside_dhaka', t('checkout.outsideDhaka'), settings?.shippingOutsideDhaka ?? 120],
                ] as const
              ).map(([value, label, cost]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setZone(value)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                    zone === value ? 'border-primary bg-primary/10' : 'border-ink/15'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-muted">
                    {formatTk(cost)}
                    {t('checkout.perShop')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="space-y-1 block">
            <span className="text-sm font-medium">{t('checkout.note')}</span>
            <input
              className="input"
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
            />
          </label>
        </div>

        <div className="card space-y-2 p-6">
          <span className="text-sm font-medium">{t('checkout.payment')}</span>
          <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 px-4 py-3 text-sm">
            <span className="font-medium">{t('checkout.cod')}</span>
            <span className="text-muted">{t('checkout.codDesc')}</span>
          </div>
          <p className="text-xs text-muted">{t('checkout.comingSoon')}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="card sticky top-28 space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">{t('checkout.yourOrder')}</h2>
          <div className="max-h-52 space-y-3 overflow-auto">
            {items.map((i) => (
              <div key={`${i.productId}:${i.variantId ?? ''}`} className="flex justify-between text-sm">
                <span className="pr-2">
                  {i.name}
                  {i.variantLabel ? ` (${i.variantLabel})` : ''} × {i.quantity}
                </span>
                <span className="whitespace-nowrap font-medium">
                  {formatTk(i.unitPrice * i.quantity)}
                </span>
              </div>
            ))}
          </div>
          {/* Coupon */}
          <div className="border-t border-ink/10 pt-3">
            {coupon ? (
              <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 text-sm">
                <span className="text-success">
                  Coupon <strong>{coupon.code}</strong> applied
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCoupon(null);
                    setCouponInput('');
                  }}
                  className="text-muted hover:text-sale"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input py-2"
                  placeholder={t('checkout.coupon')}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={applyingCoupon}
                  className="btn-outline whitespace-nowrap py-2"
                >
                  {applyingCoupon ? '…' : t('checkout.apply')}
                </button>
              </div>
            )}
            {couponError && <p className="mt-1 text-xs text-sale">{couponError}</p>}
          </div>

          <div className="space-y-1 border-t border-ink/10 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t('cart.subtotal')}</span>
              <span>{formatTk(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">
                {t('cart.shipping')}
                {shopCount > 1 ? ` (×${shopCount})` : ''}
              </span>
              <span>{formatTk(shipping)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <span>{t('checkout.discount')}</span>
                <span>−{formatTk(discount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-semibold">
              <span>{t('checkout.total')}</span>
              <span>{formatTk(grand)}</span>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('checkout.placing') : t('checkout.placeOrder')}
          </button>
        </div>
      </div>
    </form>
  );
}
