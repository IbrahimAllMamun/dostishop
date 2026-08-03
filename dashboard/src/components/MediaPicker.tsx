import { useEffect, useState } from 'react';
import { Check, Image as ImageIcon, Search } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/Skeleton';
import type { MediaAsset, MediaFolder } from '@/lib/types';

/**
 * Pick images already in the shop's library rather than uploading them again.
 *
 * Selection is by URL, not asset id: the form stores URLs, and an image may
 * legitimately be reachable through more than one library row.
 */
export function MediaPicker({
  open,
  onClose,
  onPick,
  multiple = true,
  /** Already on the form, so it can be shown as chosen and not added twice */
  existing = [],
}: {
  open: boolean;
  onClose: () => void;
  onPick: (urls: string[]) => void;
  multiple?: boolean;
  existing?: string[];
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setChosen([]);
    setSearch('');
    setFolderId('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (folderId) params.set('folderId', folderId);
    const id = setTimeout(() => {
      api
        .get<{ assets: MediaAsset[]; folders: MediaFolder[] }>(`/media?${params.toString()}`)
        .then((d) => {
          setAssets(d.assets);
          setFolders(d.folders);
        })
        .catch(() => setAssets([]))
        .finally(() => setLoading(false));
    }, search ? 250 : 0);
    return () => clearTimeout(id);
  }, [open, search, folderId]);

  function toggle(url: string) {
    if (!multiple) {
      setChosen([url]);
      return;
    }
    setChosen((c) => (c.includes(url) ? c.filter((x) => x !== url) : [...c, url]));
  }

  function confirmPick() {
    if (!chosen.length) return;
    onPick(chosen);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[min(96vw,52rem)]">
        <DialogHeader>
          <DialogTitle>Choose from library</DialogTitle>
          <DialogDescription>
            Images you have already uploaded. Picking one here does not upload anything again.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input h-8 w-48 py-0 pl-8 text-xs"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search the library"
            />
          </div>
          {folders.length > 0 && (
            <select
              className="input h-8 w-auto py-0 text-xs"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              aria-label="Folder"
            >
              <option value="">All folders</option>
              <option value="none">Unfiled</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {chosen.length ? `${chosen.length} selected` : ''}
          </span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <ImageIcon className="h-7 w-7 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">Nothing to choose from</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {search ? 'No image matches that search.' : 'Upload an image and it lands here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {assets.map((a, i) => {
                const on = chosen.includes(a.url);
                const already = existing.includes(a.url);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.url)}
                    aria-pressed={on}
                    style={{ animationDelay: `${Math.min(i, 16) * 20}ms` }}
                    className={`group relative animate-row-in overflow-hidden rounded-lg ring-1 transition-[box-shadow,transform,ring-color] duration-200 ease-out hover:shadow-lift active:scale-[0.97] ${
                      on ? 'ring-2 ring-primary' : 'ring-ink/10'
                    }`}
                  >
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={a.url}
                        alt={a.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      />
                    </div>
                    {on && (
                      <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                    {already && !on && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/70 px-1.5 py-0.5 text-[10px] text-canvas">
                        on this product
                      </span>
                    )}
                    <span className="block truncate px-1.5 py-1 text-[11px]" title={a.name}>
                      {a.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmPick}
            disabled={!chosen.length}
            className="btn-primary"
          >
            {chosen.length === 0
              ? 'Add images'
              : chosen.length === 1
                ? 'Add 1 image'
                : `Add ${chosen.length} images`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
