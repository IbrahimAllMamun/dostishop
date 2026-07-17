import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { ImageUploader } from '@/components/ImageUploader';
import type { Category } from '@/lib/types';

interface VariantRow {
  size: string;
  color: string;
  stockQty: string;
  priceOverride: string;
}

export function ProductForm() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    brand: '',
    categoryId: '',
    basePrice: '',
    salePrice: '',
    isActive: true,
    isFeatured: false,
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([
    { size: '', color: '', stockQty: '0', priceOverride: '' },
  ]);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/categories').then((d) => setCategories(d.categories));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        brand: form.brand || undefined,
        categoryId: form.categoryId || undefined,
        basePrice: Number(form.basePrice),
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        images: imageUrls.map((url, idx) => ({ url, sortOrder: idx })),
        variants: variants
          .filter((v) => v.size || v.color || Number(v.stockQty) > 0)
          .map((v) => ({
            size: v.size || undefined,
            color: v.color || undefined,
            stockQty: Number(v.stockQty) || 0,
            priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
          })),
      };
      await api.post('/products', payload);
      navigate('/vendor/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">New product</h1>
      {error && <div className="rounded-lg bg-sale/10 px-4 py-3 text-sm text-sale">{error}</div>}

      <form onSubmit={submit} className="space-y-6">
        <div className="card space-y-4 p-6">
          <div>
            <label className="label">Name *</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              rows={3}
              className="input"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Brand</label>
              <input
                className="input"
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
              >
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Base price (৳) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={form.basePrice}
                onChange={(e) => set('basePrice', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Sale price (৳)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={form.salePrice}
                onChange={(e) => set('salePrice', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
              />
              Active (visible in store)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => set('isFeatured', e.target.checked)}
              />
              Featured
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="card space-y-3 p-6">
          <h2 className="font-semibold">Product images</h2>
          <p className="text-xs text-muted">
            Upload from your device (max 5MB each). Stored locally in dev; on Cloudinary when
            configured.
          </p>
          <ImageUploader value={imageUrls} onChange={setImageUrls} />
        </div>

        {/* Variants */}
        <div className="card space-y-3 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Variants &amp; stock</h2>
            <button
              type="button"
              onClick={() =>
                setVariants((v) => [...v, { size: '', color: '', stockQty: '0', priceOverride: '' }])
              }
              className="btn-ghost btn-sm"
            >
              + Add variant
            </button>
          </div>
          {variants.map((v, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <input
                className="input"
                placeholder="Size"
                value={v.size}
                onChange={(e) =>
                  setVariants((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, size: e.target.value } : x)),
                  )
                }
              />
              <input
                className="input"
                placeholder="Color"
                value={v.color}
                onChange={(e) =>
                  setVariants((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)),
                  )
                }
              />
              <input
                className="input"
                type="number"
                min="0"
                placeholder="Stock"
                value={v.stockQty}
                onChange={(e) =>
                  setVariants((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, stockQty: e.target.value } : x)),
                  )
                }
              />
              <input
                className="input"
                type="number"
                min="0"
                placeholder="Price override"
                value={v.priceOverride}
                onChange={(e) =>
                  setVariants((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, priceOverride: e.target.value } : x)),
                  )
                }
              />
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => setVariants((arr) => arr.filter((_, i) => i !== idx))}
                  className="btn-ghost btn-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted">
            Leave size/color blank for a single default variant. Stock controls availability.
          </p>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Create product'}
          </button>
          <button type="button" onClick={() => navigate('/vendor/products')} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
