import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ImageUploader } from '@/components/ImageUploader';
import { IconPicker } from '@/components/CategoryIcon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Category } from '@/lib/types';

/**
 * Shared by the admin and vendor category pages. Name, icon and image in one
 * place — the old flow was a browser `prompt` that could only edit the name.
 */
export function CategoryEditDialog({
  category,
  onClose,
  onSaved,
  /** Shown to admins when they are about to take over a vendor's category */
  warnOnCuration,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
  warnOnCuration?: boolean;
}) {
  // Kept so the content stays mounted through Radix's exit animation
  const [shown, setShown] = useState<Category | null>(category);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) return;
    setShown(category);
    setName(category.name);
    setIcon(category.icon ?? '');
    setImageUrls(category.imageUrl ? [category.imageUrl] : []);
    setError(null);
  }, [category]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!shown || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/categories/${shown.id}`, {
        name: name.trim(),
        icon: icon || null,
        imageUrl: imageUrls[0] ?? null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const takingOver = warnOnCuration && shown?.createdById && !shown.adminLocked;

  return (
    <Dialog open={Boolean(category)} onOpenChange={(next) => !next && onClose()}>
      {shown && (
        <DialogContent className="w-[min(94vw,32rem)]">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              Every shop sees this, so keep the name generic.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="grid gap-4">
            {takingOver && (
              <p className="rounded-lg bg-gold/15 px-3 py-2 text-xs text-warn">
                A vendor added this category. Saving hands ownership to the platform — they will
                not be able to change it afterwards.
              </p>
            )}
            {error && (
              <p className="animate-fade-up rounded-lg bg-sale/10 px-3 py-2 text-sm text-sale">
                {error}
              </p>
            )}

            <div>
              <label className="label" htmlFor="cat-name">
                Name
              </label>
              <input
                id="cat-name"
                autoFocus
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <span className="label">Icon</span>
              <IconPicker value={icon} onChange={setIcon} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Used when there is no image.
              </p>
            </div>

            <div>
              <span className="label">Image</span>
              <ImageUploader multiple={false} value={imageUrls} onChange={setImageUrls} />
            </div>

            <DialogFooter>
              <button type="button" onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
