import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { ImageUploader } from '@/components/ImageUploader';
import type { Category, Product } from '@/lib/types';

interface VariantRow {
  id?: string;
  size: string;
  color: string;
  stockQty: string;
  priceOverride: string;
}

const emptyVariant: VariantRow = { size: '', color: '', stockQty: '0', priceOverride: '' };

export function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

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
  const [variants, setVariants] = useState<VariantRow[]>([{ ...emptyVariant }]);

  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/categories').then((d) => setCategories(d.categories));
  }, []);

  const topCategories = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  async function createCategory() {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    setError(null);
    try {
      const d = await api.post<{ category: Category }>('/categories', {
        name: newCatName.trim(),
        parentId: newCatParent || undefined,
      });
      const list = await api.get<{ categories: Category[] }>('/categories');
      setCategories(list.categories);
      set('categoryId', d.category.id);
      setNewCatOpen(false);
      setNewCatName('');
      setNewCatParent('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  }

  useEffect(() => {
    if (!isEdit) return;
    api
      .get<{ product: Product }>(`/products/mine/${id}`)
      .then((d) => {
        const p = d.product;
        setForm({
          name: p.name,
          description: p.description ?? '',
          brand: p.brand ?? '',
          categoryId: p.categoryId ?? '',
          basePrice: String(Number(p.basePrice)),
          salePrice: p.salePrice != null ? String(Number(p.salePrice)) : '',
          isActive: p.isActive,
          isFeatured: p.isFeatured,
        });
        setImageUrls((p.images ?? []).map((im) => im.url));
        setVariants(
          (p.variants ?? []).length
            ? (p.variants ?? []).map((v) => ({
                id: v.id,
                size: v.size ?? '',
                color: v.color ?? '',
                stockQty: String(v.stockQty),
                priceOverride: v.priceOverride != null ? String(Number(v.priceOverride)) : '',
              }))
            : [{ ...emptyVariant }],
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

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
          .filter((v) => v.id || v.size || v.color || Number(v.stockQty) > 0)
          .map((v) => ({
            ...(v.id ? { id: v.id } : {}),
            size: v.size || undefined,
            color: v.color || undefined,
            stockQty: Number(v.stockQty) || 0,
            priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
          })),
      };
      if (isEdit) {
        await api.patch(`/products/${id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      navigate('/vendor/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{isEdit ? 'Edit product' : 'New product'}</h1>
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
              <div className="flex items-center justify-between">
                <label className="label">Category</label>
                <button
                  type="button"
                  onClick={() => setNewCatOpen((o) => !o)}
                  className="mb-1 text-xs text-primary hover:underline"
                >
                  {newCatOpen ? 'Cancel' : '+ New category'}
                </button>
              </div>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
              >
                <option value="">— none —</option>
                {topCategories.map((top) => {
                  const subs = childrenOf(top.id);
                  return subs.length ? (
                    <optgroup key={top.id} label={top.name}>
                      <option value={top.id}>{top.name} (all)</option>
                      {subs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <option key={top.id} value={top.id}>
                      {top.name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {newCatOpen && (
            <div className="grid gap-3 rounded-lg bg-canvas p-3 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="label">New category name</label>
                <input
                  className="input"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Sneakers"
                />
              </div>
              <div>
                <label className="label">Under (optional)</label>
                <select
                  className="input"
                  value={newCatParent}
                  onChange={(e) => setNewCatParent(e.target.value)}
                >
                  <option value="">— top level —</option>
                  {topCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="self-end">
                <button
                  type="button"
                  onClick={createCategory}
                  disabled={creatingCat}
                  className="btn-primary btn-sm"
                >
                  {creatingCat ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          )}
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
          <p className="text-xs text-muted-foreground">
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
              onClick={() => setVariants((v) => [...v, { ...emptyVariant }])}
              className="btn-ghost btn-sm"
            >
              + Add variant
            </button>
          </div>
          {variants.map((v, idx) => (
            <div key={v.id ?? idx} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
          <p className="text-xs text-muted-foreground">
            Leave size/color blank for a single default variant. Stock controls availability.
          </p>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </button>
          <button type="button" onClick={() => navigate('/vendor/products')} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
