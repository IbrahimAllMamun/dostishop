import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useDialogs } from '@/components/Dialogs';
import { ProductFields, useProductForm } from '@/components/ProductFormFields';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Product } from '@/lib/types';

/**
 * Edit-in-place for the products list: click a row, get the whole form
 * prefilled. Save and Delete live at the bottom of the sheet; Delete routes
 * through the animated confirm dialog rather than the browser's.
 */
export function ProductEditDialog({
  product,
  onClose,
  onSaved,
  onDeleted,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: (id: string) => void;
}) {
  const { confirm, notify } = useDialogs();
  // `product` goes null the moment the list closes us, but Radix needs the
  // content mounted through its exit animation — so render the last one we saw.
  const [shown, setShown] = useState<Product | null>(product);
  useEffect(() => {
    if (product) setShown(product);
  }, [product]);

  const state = useProductForm(shown?.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await state.save()) {
      onSaved();
      onClose();
    }
  }

  async function remove() {
    if (!shown) return;
    const ok = await confirm({
      title: `Delete "${shown.name}"?`,
      description:
        'It disappears from the storefront immediately. Past orders keep their own copy of the name and price, so your order history stays intact.',
      confirmLabel: 'Delete product',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/products/${shown.id}`);
      onDeleted(shown.id);
      onClose();
    } catch (e) {
      await notify({
        title: 'Could not delete',
        description: e instanceof Error ? e.message : 'Failed',
        tone: 'danger',
      });
    }
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={(next) => !next && onClose()}>
      {shown && (
        <DialogContent className="w-[min(94vw,44rem)] gap-0 bg-canvas p-0">
          <DialogHeader className="sticky top-0 z-10 border-b border-ink/5 bg-canvas/95 px-6 py-4 backdrop-blur">
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>{shown.name}</DialogDescription>
          </DialogHeader>

          {state.loading ? (
            <div className="space-y-3 p-6">
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-40 w-full" />
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5 px-6 py-5">
              {state.error && (
                <div className="animate-fade-up rounded-lg bg-sale/10 px-4 py-3 text-sm text-sale">
                  {state.error}
                </div>
              )}

              <ProductFields state={state} />

              <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center gap-3 border-t border-ink/5 bg-canvas/95 px-6 py-4 backdrop-blur">
                <button type="submit" disabled={state.saving} className="btn-primary">
                  {state.saving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" onClick={onClose} className="btn-ghost">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={remove}
                  className="btn ml-auto border border-sale/25 text-sale transition-[border-color,background-color,transform] duration-200 ease-out hover:border-sale hover:bg-sale/10 active:scale-[0.97]"
                >
                  Delete
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
