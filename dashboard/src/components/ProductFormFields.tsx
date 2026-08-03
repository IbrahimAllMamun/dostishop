import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Trash2 } from 'lucide-react';
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
   * The three pieces of variant state are interdependent: ticking an attribute
   * changes the axes, which changes the rows. React does not expose a state
   * update until the next render, so two toggles dispatched in one batch would
   * both read the pre-batch value and the second would discard the first.
   * Handlers therefore read from here and write through `commit`; the render
   * body below resyncs it for updates that come from anywhere else.
   */
  const latest = useRef({ attributeIds, axisValueIds, variants });
  latest.current = { attributeIds, axisValueIds, variants };

  function commit(next: {
    attributeIds?: string[];
    axisValueIds?: Record<string, string[]>;
    variants?: VariantRow[];
  }) {
    latest.current = { ...latest.current, ...next };
    if (next.attributeIds) setAttributeIds(next.attributeIds);
    if (next.axisValueIds) setAxisValueIds(next.axisValueIds);
    if (next.variants) setVariants(next.variants);
  }

  /** A row the vendor has not put anything into, so it is safe to discard. */
  const isUntouched = (r: VariantRow) =>
    !r.id && !(Number(r.stockQty) > 0) && !r.priceOverride;

  /**
   * Rebuild the rows from the ticked values: one row per combination.
   *
   * Rows that already carry a combination keep their id, stock and price
   * override. Rows that fall outside the new matrix are dropped only when the
   * vendor never filled them in — anything with stock, a price override, or a
   * saved id survives, because a stray click must not wipe a season's counts.
   * Those survivors are flagged in the UI so they can be removed deliberately.
   *
   * Only ever called from a tick. Running it on load would be wrong: real
   * catalogues are sparse, and three saved variants spanning three attributes
   * would expand into eighteen rows the moment the form opened.
   */
  function reconcile(
    rows: VariantRow[],
    ticks: Record<string, string[]>,
    selectedIds: string[],
  ): VariantRow[] {
    const axes = attributes.filter(
      (a) => a.isVariant && selectedIds.includes(a.id) && (ticks[a.id] ?? []).length > 0,
    );

    // No axis ticked yet: collapse to a single default row, keeping any real data
    if (!axes.length) {
      const kept = rows.filter((r) => !isUntouched(r));
      return kept.length ? kept : [{ ...emptyVariant }];
    }

    const combos = axes.reduce<string[][]>(
      (acc, a) => acc.flatMap((prefix) => (ticks[a.id] ?? []).map((v) => [...prefix, v])),
      [[]],
    );
    const target = new Map(combos.map((c) => [comboKey(c), c]));

    // Keep rows that are still wanted, plus any the vendor has invested in
    const kept = rows.filter((r) => target.has(comboKey(r.attributeValueIds)) || !isUntouched(r));
    const seen = new Set(kept.map((r) => comboKey(r.attributeValueIds)));

    const fresh = [...target.entries()]
      .filter(([key]) => !seen.has(key))
      .map(([, attributeValueIds]) => ({ ...emptyVariant, attributeValueIds }));

    return [...kept, ...fresh];
  }

  /**
   * Turning an attribute off has to take its traces with it, or the product
   * saves variant values along an axis it no longer claims.
   */
  function toggleAttribute(attr: Attribute) {
    const current = latest.current;
    const on = current.attributeIds.includes(attr.id);
    const nextIds = on
      ? current.attributeIds.filter((x) => x !== attr.id)
      : [...current.attributeIds, attr.id];

    if (!on) {
      commit({ attributeIds: nextIds });
      return;
    }

    const ownValueIds = new Set(attr.values.map((v) => v.id));
    const nextTicks = { ...current.axisValueIds };
    delete nextTicks[attr.id];

    setSpecValueIds((ids) => ids.filter((x) => !ownValueIds.has(x)));
    commit({
      attributeIds: nextIds,
      axisValueIds: nextTicks,
      variants: reconcile(
        current.variants.map((r) => ({
          ...r,
          attributeValueIds: r.attributeValueIds.filter((x) => !ownValueIds.has(x)),
        })),
        nextTicks,
        nextIds,
      ),
    });
  }

  function toggleSpecValue(valueId: string) {
    setSpecValueIds((ids) =>
      ids.includes(valueId) ? ids.filter((x) => x !== valueId) : [...ids, valueId],
    );
  }

  /**
   * Ticking a value is the only edit the vendor makes to the matrix — the rows
   * follow immediately, so there is nothing to press afterwards.
   */
  function toggleAxisValue(attributeId: string, valueId: string) {
    const state = latest.current;
    const ticked = state.axisValueIds[attributeId] ?? [];
    const next = {
      ...state.axisValueIds,
      [attributeId]: ticked.includes(valueId)
        ? ticked.filter((x) => x !== valueId)
        : [...ticked, valueId],
    };
    commit({
      axisValueIds: next,
      variants: reconcile(state.variants, next, state.attributeIds),
    });
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

  /** Resolve a value id to its attribute and value, for the row labels. */
  const valueIndex = useMemo(() => {
    const map = new Map<string, { attribute: Attribute; value: AttributeValue }>();
    for (const attribute of attributes) {
      for (const value of attribute.values) map.set(value.id, { attribute, value });
    }
    return map;
  }, [attributes]);

  /** The combinations the ticks currently describe, for spotting strays below. */
  const wantedCombos = useMemo(() => {
    const usable = axes.filter((a) => (axisValueIds[a.id] ?? []).length > 0);
    if (!usable.length) return null;
    return new Set(
      usable
        .reduce<string[][]>(
          (acc, a) => acc.flatMap((prefix) => (axisValueIds[a.id] ?? []).map((v) => [...prefix, v])),
          [[]],
        )
        .map((c) => comboKey(c)),
    );
  }, [axes, axisValueIds]);

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

      {/* Options — tick what the product comes in; the rows below follow */}
      {axes.length > 0 && (
        <div className="card space-y-4 p-6">
          <div>
            <h2 className="font-semibold">Options</h2>
            <p className="text-xs text-muted-foreground">
              Tick the values this product comes in. A row appears below for every combination.
            </p>
          </div>
          {axes.map((attr) => (
            <div key={attr.id}>
              <span className="label">{attr.name}</span>
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
        </div>
      )}

      {/* Stock — one row per combination, nothing to choose here */}
      <div className="card space-y-3 p-6">
        <div>
          <h2 className="font-semibold">Stock &amp; pricing</h2>
          <p className="text-xs text-muted-foreground">
            {axes.length === 0
              ? 'No options selected, so this product has a single stock row.'
              : `${variants.length} combination${variants.length === 1 ? '' : 's'}. Leave the price override blank to use the base price.`}
          </p>
        </div>

        {/* Column headers, so the two number fields are labelled once rather
            than on every row — the thing that made this section noisy. */}
        {variants.length > 0 && (
          <div className="hidden gap-3 px-3 sm:grid sm:grid-cols-[1fr_7rem_9rem_auto]">
            <span className="text-xs font-medium text-muted-foreground">
              {axes.length ? 'Combination' : 'Default'}
            </span>
            <span className="text-xs font-medium text-muted-foreground">Stock</span>
            <span className="text-xs font-medium text-muted-foreground">Price override</span>
            <span className="w-16" />
          </div>
        )}

        {variants.map((v, idx) => {
          const parts = v.attributeValueIds
            .map((id) => valueIndex.get(id))
            .filter((p): p is { attribute: Attribute; value: AttributeValue } => Boolean(p))
            .sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder);

          // A row the ticks no longer ask for, kept because it holds real data
          const stray = Boolean(wantedCombos && !wantedCombos.has(comboKey(v.attributeValueIds)));

          return (
            <div
              key={v.id ?? idx}
              className={`grid animate-row-in items-center gap-3 rounded-lg p-3 sm:grid-cols-[1fr_7rem_9rem_auto] ${
                stray ? 'bg-gold/10 ring-1 ring-inset ring-warn/30' : 'bg-canvas'
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                {parts.length === 0 ? (
                  <span className="text-muted-foreground">Single variant</span>
                ) : (
                  parts.map((p, i) => (
                    <span key={p.value.id} className="inline-flex items-center gap-1.5">
                      {i > 0 && <span className="text-muted-foreground">·</span>}
                      {p.value.color && <Swatch hex={p.value.color.hexCode} size="sm" />}
                      {p.value.value}
                    </span>
                  ))
                )}
                {stray && (
                  <span className="badge-warn" title="Not in your current selection">
                    not selected
                  </span>
                )}
              </div>

              <div>
                <label className="sr-only" htmlFor={`stock-${idx}`}>
                  Stock for {parts.map((p) => p.value.value).join(' ') || 'this product'}
                </label>
                <input
                  id={`stock-${idx}`}
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
                <label className="sr-only" htmlFor={`price-${idx}`}>
                  Price override for {parts.map((p) => p.value.value).join(' ') || 'this product'}
                </label>
                <input
                  id={`price-${idx}`}
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

              <div className="w-16">
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setVariants((arr) => arr.filter((_, i) => i !== idx))}
                    aria-label={`Remove ${parts.map((p) => p.value.value).join(' ') || 'this row'}`}
                    className="row-action hover:bg-sale/10 hover:text-sale"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
