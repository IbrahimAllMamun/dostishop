'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postReview, uploadReviewPhoto } from '@/lib/api';
import { useT } from '@/i18n/I18nProvider';

export function ReviewForm({ productId }: { productId: string }) {
  const t = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [form, setForm] = useState({ customerName: '', phone: '', comment: '', orderNo: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, 3 - photos.length)) {
        const url = await uploadReviewPhoto(file);
        setPhotos((p) => [...p, url]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await postReview({
        productId,
        rating,
        comment: form.comment || undefined,
        customerName: form.customerName,
        phone: form.phone,
        orderNo: form.orderNo || undefined,
        photos: photos.length ? photos : undefined,
      });
      setDone(
        res.isVerified
          ? 'Thanks! Your verified review will appear after moderation.'
          : 'Thanks! Your review will appear after moderation.',
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{done}</div>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline">
        {t('product.writeReview')}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {/* Star picker */}
      <div>
        <span className="text-sm font-medium">Your rating *</span>
        <div className="mt-1 flex gap-1 text-2xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className={(hover || rating) >= n ? 'text-gold' : 'text-ink/20'}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium">Name *</span>
          <input
            required
            className="input"
            value={form.customerName}
            onChange={(e) => set('customerName', e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Phone *</span>
          <input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="input"
            placeholder="01XXXXXXXXX"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Your review</span>
        <textarea
          rows={3}
          className="input"
          placeholder="How was the product?"
          value={form.comment}
          onChange={(e) => set('comment', e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Order number (optional)</span>
        <input
          className="input"
          placeholder="ORD-… — earns a Verified Purchase badge"
          value={form.orderNo}
          onChange={(e) => set('orderNo', e.target.value)}
        />
      </label>

      {/* Photos */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Photos (up to 3)</span>
        <div className="flex flex-wrap items-center gap-3">
          {photos.map((url, i) => (
            <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg bg-sand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink/70 text-[10px] text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length < 3 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-ink/20 text-xl text-muted hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {uploading ? '…' : '+'}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />
      </div>

      {error && <p className="text-sm text-sale">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline">
          Cancel
        </button>
      </div>
    </form>
  );
}
