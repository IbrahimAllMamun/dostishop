import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ImageUploader } from '@/components/ImageUploader';
import { Swatch, swatchInk } from '@/components/Swatch';
import type { Attribute, AttributeValue, Category, Product } from '@/lib/types';

/**
 * The product form, shared by the full-page "new product" route and the edit
 * modal on the products list. `useProductForm` owns the state and the save
 * call; `ProductFields` is the markup. Keeping them apart lets each caller
 * place its own footer (page actions vs. modal Save/Delete).
 *
 * A product declares which attributes it uses before anything else. Everything
 * below — the variant columns, the specification fields, the generator — is
 * scoped to that choice, so a handbag never sees a Size dropdown.
 */

export interface VariantRow {
  id?: string;
  /** AttributeValue ids — the normalised definition of this variant */
  attributeValueIds: string[];
  stockQty: string;
  priceOverride: string;
}

const emptyVariant: VariantRow = { attributeValueIds: [], stockQty: '0', priceOverride: '' };

/** Stable identity for a variant: the set of values it carries, order-independent. */
const comboKey = (valueIds: string[]) => [...valueIds].sort().join('|');

interface FormValues {
  name: string;
  description: string;
  brand: string;
  categoryId: string;
  basePrice: string;
  salePrice: string;
  isActive: boolean;
  isFeatured: boolean;
}

const emptyForm: FormValues = {
  name: '',
  description: '',
  brand: '',
  categoryId: '',
  basePrice: '',
  salePrice: '',
  isActive: true,
  isFeatured: false,
};

export function useProductForm(id?: string) {
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [form, setForm] = useState<FormValues>(emptyForm);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([{ ...emptyVariant }]);

  /** Which attributes this product uses — variant axes and specifications alike. */
  const [attributeIds, setAttributeIds] = useState<string[]>([]);
  /** Chosen values for the specification attributes above. */
  const [specValueIds, setSpecValueIds] = useState<string[]>([]);
  /**
   * Which values of each axis this product comes in. Not persisted — the
   * variants themselves record that — but it is what the generator builds from,
   * and it is seeded from the existing variants on load.
   */
  const [axisValueIds, setAxisValueIds] = useState<Record<string, string[]>>({});

  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/categories').then((d) => setCategories(d.categories));
    api.get<{ attributes: Attribute[] }>('/attributes').then((d) => setAttributes(d.attributes));
  }, []);

  useEffect(() => {
    if (!id) {
      setForm(emptyForm);
      setImageUrls([]);
      setVariants([{ ...emptyVariant }]);
      setAttributeIds([]);
      setSpecValueIds([]);
      setAxisValueIds({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
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
        const rows = (p.variants ?? []).map((v) => ({
          id: v.id,
          attributeValueIds: (v.attributes ?? []).map((a) => a.valueId),
          stockQty: String(v.stockQty),
          priceOverride: v.priceOverride != null ? String(Number(v.priceOverride)) : '',
        }));
        setVariants(rows.length ? rows : [{ ...emptyVariant }]);
        setAttributeIds((p.attributes ?? []).map((a) => a.attributeId));
        setSpecValueIds((p.specValues ?? []).map((s) => s.valueId));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  /**
   * Seed the generator's ticks from the variants that already exist. Runs once
   * the registry has arrived, since mapping a value id to its attribute needs it.
   */
  useEffect(() => {
    if (!attributes.length || !variants.length) return;
    setAxisValueIds((current) => {
      if (Object.keys(current).length) return current;
      const owner = new Map<string, string>();
      for (const a of attributes) for (const v of a.values) owner.set(v.id, a.id);

      const seeded: Record<string, string[]> = {};
      for (const row of variants) {
        for (const valueId of row.attributeValueIds) {
          const attrId = owner.get(valueId);
          if (!attrId) continue;
          if (!seeded[attrId]) seeded[attrId] = [];
          if (!seeded[attrId].includes(valueId)) seeded[attrId].push(valueId);
        }
      }
      return Object.keys(seeded).length ? seeded : current;
    });
  }, [attributes, variants]);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /**
   * Turning an attribute off has to take its traces with it, or the product
   * saves variant values along an axis it no longer claims.
   */
  function toggleAttribute(attr: Attribute) {
    const on = attributeIds.includes(attr.id);
    if (!on) {
      setAttributeIds((ids) => [...ids, attr.id]);
      return;
    }
    const ownValueIds = new Set(attr.values.map((v) => v.id));
    setAttributeIds((ids) => ids.filter((x) => x !== attr.id));
    setSpecValueIds((ids) => ids.filter((x) => !ownValueIds.has(x)));
    setAxisValueIds((m) => {
      const next = { ...m };
      delete next[attr.id];
      return next;
    });
    setVariants((rows) =>
      rows.map((r) => ({
        ...r,
        attributeValueIds: r.attributeValueIds.filter((x) => !ownValueIds.has(x)),
      })),
    );
  }

  function toggleSpecValue(valueId: string) {
    setSpecValueIds((ids) =>
      ids.includes(valueId) ? ids.filter((x) => x !== valueId) : [...ids, valueId],
    );
  }

  function toggleAxisValue(attributeId: string, valueId: string) {
    setAxisValueIds((m) => {
      const current = m[attributeId] ?? [];
      return {
        ...m,
        [attributeId]: current.includes(valueId)
          ? current.filter((x) => x !== valueId)
          : [...current, valueId],
      };
    });
  }

  /**
   * Build every combination of the ticked values, one variant row each.
   *
   * Additive on purpose: rows that already exist keep their id, stock and price
   * override, and rows outside the new matrix are left alone rather than
   * deleted. Generating is a convenience, not a destructive rebuild — a stray
   * click should never wipe a season's stock counts.
   */
  function generateVariants(axes: Array<{ attributeId: string; valueIds: string[] }>): number {
    const usable = axes.filter((a) => a.valueIds.length);
    if (!usable.length) return 0;

    const combos = usable.reduce<string[][]>(
      (acc, axis) => acc.flatMap((prefix) => axis.valueIds.map((v) => [...prefix, v])),
      [[]],
    );

    // Computed from the current state rather than inside the updater: the
    // caller needs the count now, and an updater does not run until React
    // re-renders (and may run twice under StrictMode).
    const [first] = variants;
    const isBlankPlaceholder =
      variants.length === 1 &&
      !first.id &&
      !first.attributeValueIds.length &&
      Number(first.stockQty) === 0 &&
      !first.priceOverride;
    const base = isBlankPlaceholder ? [] : variants;

    const seen = new Set(base.map((r) => comboKey(r.attributeValueIds)));
    const fresh = combos
      .filter((c) => !seen.has(comboKey(c)))
      .map((attributeValueIds) => ({ ...emptyVariant, attributeValueIds }));

    if (fresh.length || isBlankPlaceholder) setVariants([...base, ...fresh]);
    return fresh.length;
  }

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

  /** Returns true on success; the caller decides where to go next. */
  async function save(): Promise<boolean> {
    setError(null);
    setSaving(true);
    try {
      // Only the selected attributes' values may travel with the product
      const selected = new Set(attributeIds);
      const allowedValueIds = new Set(
        attributes.filter((a) => selected.has(a.id)).flatMap((a) => a.values.map((v) => v.id)),
      );

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
        attributeIds,
        specValueIds: specValueIds.filter((v) => allowedValueIds.has(v)),
        variants: variants
          .filter((v) => v.id || v.attributeValueIds.length || Number(v.stockQty) > 0)
          .map((v) => ({
            ...(v.id ? { id: v.id } : {}),
            // Server derives size/color from these
            attributeValueIds: v.attributeValueIds.filter((x) => allowedValueIds.has(x)),
            stockQty: Number(v.stockQty) || 0,
            priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
          })),
      };
      if (isEdit) await api.patch(`/products/${id}`, payload);
      else await api.post('/products', payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    isEdit,
    categories,
    attributes,
    error,
    setError,
    saving,
    loading,
    form,
    set,
    imageUrls,
    setImageUrls,
    variants,
    setVariants,
    attributeIds,
    toggleAttribute,
    specValueIds,
    toggleSpecValue,
    axisValueIds,
    toggleAxisValue,
    generateVariants,
    newCatOpen,
    setNewCatOpen,
    newCatName,
    setNewCatName,
    newCatParent,
    setNewCatParent,
    creatingCat,
    createCategory,
    save,
  };
}

export type ProductFormState = ReturnType<typeof useProductForm>;

/** Toggle chip for a value — used for both spec values and generator axes. */
function ValueToggle({
  value,
  selected,
  onToggle,
  index,
}: {
  value: AttributeValue;
  selected: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      style={{ animationDelay: `${Math.min(index, 12) * 20}ms` }}
      className={`inline-flex animate-row-in items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-[border-color,background-color,transform] duration-200 ease-out active:scale-[0.97] ${
        selected
          ? 'border-primary bg-primary/10 text-primary-strong'
          : 'border-ink/15 text-ink hover:border-ink/40'
      }`}
    >
      {value.color ? (
        <span className="relative inline-flex">
          <Swatch hex={value.color.hexCode} size="sm" />
          {selected && (
            <Check
              aria-hidden
              strokeWidth={3}
              style={{ color: swatchInk(value.color.hexCode) }}
              className="absolute inset-0 m-auto h-2.5 w-2.5"
            />
          )}
        </span>
      ) : (
        selected && <Check aria-hidden strokeWidth={3} className="h-3 w-3" />
      )}
      {value.value}
    </button>
  );
}

export function ProductFields({ state }: { state: ProductFormState }) {
  const {
    categories,
    attributes,
    form,
    set,
    imageUrls,
    setImageUrls,
    variants,
    setVariants,
    attributeIds,
    toggleAttribute,
    specValueIds,
    toggleSpecValue,
    axisValueIds,
    toggleAxisValue,
    generateVariants,
    newCatOpen,
    setNewCatOpen,
    newCatName,
    setNewCatName,
    newCatParent,
    setNewCatParent,
    creatingCat,
    createCategory,
  } = state;

  const topCategories = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  const selected = useMemo(() => new Set(attributeIds), [attributeIds]);
  const axes = useMemo(
    () => attributes.filter((a) => a.isVariant && selected.has(a.id)),
    [attributes, selected],
  );
  const specs = useMemo(
    () => attributes.filter((a) => !a.isVariant && selected.has(a.id)),
    [attributes, selected],
  );

  const [generated, setGenerated] = useState<string | null>(null);
  const pendingCombos = useMemo(
    () => axes.reduce((n, a) => n * Math.max((axisValueIds[a.id] ?? []).length, 0), 1),
    [axes, axisValueIds],
  );
  const canGenerate = axes.length > 0 && axes.every((a) => (axisValueIds[a.id] ?? []).length > 0);

  function runGenerate() {
    const added = generateVariants(
      axes.map((a) => ({ attributeId: a.id, valueIds: axisValueIds[a.id] ?? [] })),
    );
    setGenerated(
      added === 0
        ? 'Every combination already exists.'
        : `Added ${added} variant${added === 1 ? '' : 's'}.`,
    );
  }

  return (
    <>
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
                onClick={() => setNewCatOpen(!newCatOpen)}
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
          <div className="grid animate-fade-up gap-3 rounded-lg bg-canvas p-3 sm:grid-cols-[1fr_1fr_auto]">
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

      {/* Which attributes apply. Everything below is scoped to this choice. */}
      <div className="card space-y-3 p-6">
        <div>
          <h2 className="font-semibold">Attributes</h2>
          <p className="text-xs text-muted-foreground">
            Pick only what this product actually uses. Variant axes create stock rows;
            specifications are stated once. Options come from{' '}
            <Link to="/vendor/attributes" className="text-primary hover:underline">
              Attributes
            </Link>
            .
          </p>
        </div>
        {attributes.length === 0 ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            No attributes defined yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Attributes used">
            {attributes.map((attr, i) => {
              const on = selected.has(attr.id);
              return (
                <button
                  key={attr.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleAttribute(attr)}
                  style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}
                  className={`inline-flex animate-row-in items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-[border-color,background-color,transform] duration-200 ease-out active:scale-[0.97] ${
                    on
                      ? 'border-primary bg-primary/10 text-primary-strong'
                      : 'border-ink/15 text-ink hover:border-ink/40'
                  }`}
                >
                  {on && <Check aria-hidden strokeWidth={3} className="h-3 w-3" />}
                  {attr.name}
                  {!attr.isVariant && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      spec
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Specifications — stated once, never a variant */}
      {specs.length > 0 && (
        <div className="card space-y-4 p-6">
          <div>
            <h2 className="font-semibold">Specifications</h2>
            <p className="text-xs text-muted-foreground">
              Facts about the product itself. Shoppers see these as a detail list, not as choices.
            </p>
          </div>
          {specs.map((attr) => (
            <div key={attr.id}>
              <span className="label">{attr.name}</span>
              {attr.values.length ? (
                <div className="flex flex-wrap gap-2" role="group" aria-label={attr.name}>
                  {attr.values.map((v, i) => (
                    <ValueToggle
                      key={v.id}
                      value={v}
                      index={i}
                      selected={specValueIds.includes(v.id)}
                      onToggle={() => toggleSpecValue(v.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">This attribute has no values yet.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Variants */}
      <div className="card space-y-4 p-6">
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

        {/* Generator: tick the values this product comes in, build the grid once */}
        {axes.length > 0 && (
          <div className="space-y-3 rounded-lg bg-canvas p-4">
            <div>
              <h3 className="text-sm font-medium">Build the combinations</h3>
              <p className="text-xs text-muted-foreground">
                Tick what this product comes in, then generate a row for each combination.
                Existing rows keep their stock.
              </p>
            </div>
            {axes.map((attr) => (
              <div key={attr.id}>
                <span className="label text-xs">{attr.name}</span>
                {attr.values.length ? (
                  <div className="flex flex-wrap gap-2" role="group" aria-label={attr.name}>
                    {attr.values.map((v, i) => (
                      <ValueToggle
                        key={v.id}
                        value={v}
                        index={i}
                        selected={(axisValueIds[attr.id] ?? []).includes(v.id)}
                        onToggle={() => toggleAxisValue(attr.id, v.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">This attribute has no values yet.</p>
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runGenerate}
                disabled={!canGenerate}
                className="btn-primary btn-sm"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Generate {canGenerate ? `${pendingCombos} ` : ''}variant
                {canGenerate && pendingCombos === 1 ? '' : 's'}
              </button>
              <p aria-live="polite" className="text-xs text-muted-foreground">
                {generated ??
                  (canGenerate ? '' : 'Tick at least one value on every axis.')}
              </p>
            </div>
          </div>
        )}

        {variants.map((v, idx) => {
          /** Swap this row's pick for `attr`, leaving its other attributes alone. */
          const setPick = (attr: Attribute, valueId: string) =>
            setVariants((arr) =>
              arr.map((x, i) => {
                if (i !== idx) return x;
                const otherAttrValueIds = x.attributeValueIds.filter(
                  (id) => !attr.values.some((av) => av.id === id),
                );
                return {
                  ...x,
                  attributeValueIds: valueId ? [...otherAttrValueIds, valueId] : otherAttrValueIds,
                };
              }),
            );

          return (
            <div
              key={v.id ?? idx}
              className="grid gap-2 rounded-lg bg-canvas p-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              {axes.map((attr) => {
                const current = v.attributeValueIds.find((id) =>
                  attr.values.some((av) => av.id === id),
                );
                const picked = attr.values.find((av) => av.id === current);
                return (
                  <div key={attr.id}>
                    <label className="label text-xs">{attr.name}</label>
                    <div className="flex items-center gap-2">
                      {/* The select carries the name; the swatch beside it says
                          which colour that name means. */}
                      {picked?.color && <Swatch hex={picked.color.hexCode} name={picked.value} />}
                      <select
                        className="input"
                        value={current ?? ''}
                        onChange={(e) => setPick(attr, e.target.value)}
                      >
                        <option value="">— any —</option>
                        {attr.values.map((av) => (
                          <option key={av.id} value={av.id}>
                            {av.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}

              <div>
                <label className="label text-xs">Stock</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={v.stockQty}
                  onChange={(e) =>
                    setVariants((arr) =>
                      arr.map((x, i) => (i === idx ? { ...x, stockQty: e.target.value } : x)),
                    )
                  }
                />
              </div>
              <div>
                <label className="label text-xs">Price override</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="—"
                  value={v.priceOverride}
                  onChange={(e) =>
                    setVariants((arr) =>
                      arr.map((x, i) => (i === idx ? { ...x, priceOverride: e.target.value } : x)),
                    )
                  }
                />
              </div>

              {variants.length > 1 && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setVariants((arr) => arr.filter((_, i) => i !== idx))}
                    className="btn-ghost btn-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground">
          {axes.length === 0
            ? 'No variant axes selected, so this product has a single stock row.'
            : 'Stock controls availability. A row left on “any” for every axis is the product’s default.'}
        </p>
      </div>
    </>
  );
}
