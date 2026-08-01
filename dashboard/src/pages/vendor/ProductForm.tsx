import { useNavigate, useParams } from 'react-router-dom';
import { ProductFields, useProductForm } from '@/components/ProductFormFields';

export function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const state = useProductForm(id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await state.save()) navigate('/vendor/products');
  }

  if (state.loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{state.isEdit ? 'Edit product' : 'New product'}</h1>
      {state.error && (
        <div className="animate-fade-up rounded-lg bg-sale/10 px-4 py-3 text-sm text-sale">
          {state.error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <ProductFields state={state} />

        <div className="flex gap-3">
          <button type="submit" disabled={state.saving} className="btn-primary">
            {state.saving ? 'Saving…' : state.isEdit ? 'Save changes' : 'Create product'}
          </button>
          <button type="button" onClick={() => navigate('/vendor/products')} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
