import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FolderPlus,
  Grid2x2,
  Image as ImageIcon,
  List,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatBytes, formatDate, uploadFiles } from '@/lib/media';
import { useDialogs } from '@/components/Dialogs';
import { Skeleton } from '@/components/Skeleton';
import type { MediaAsset, MediaFolder } from '@/lib/types';

/**
 * The shop's media library: everything it has uploaded, in one place, so an
 * image can be reused instead of uploaded twice.
 *
 * Layout follows the Remos gallery — toolbar, a file bar carrying sort and the
 * view toggle, the grid, and a detail panel on the right — in this project's
 * palette. Below `xl` the detail panel becomes a sheet under the grid rather
 * than a column, since a 320px sidebar and a grid do not both fit on a phone.
 */

type SortKey = 'newest' | 'oldest' | 'name' | 'largest';
type UsageKey = '' | 'used' | 'unused';

export function Gallery() {
  const { confirm, notify, prompt } = useDialogs();

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [folderId, setFolderId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [usage, setUsage] = useState<UsageKey>('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Every fetch goes through this one effect, and mutations ask for a refresh
   * by bumping the key rather than calling a loader themselves.
   *
   * Doing it the other way round raced: deleting the folder being viewed
   * reset the filter *and* issued its own request, so two were in flight — one
   * carrying the now-deleted folder id. Whichever landed last won, and it was
   * usually the stale one, leaving the grid empty on a library full of images.
   * The cleanup flag below settles the same question for fast typing.
   */
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (folderId) params.set('folderId', folderId);
    if (search.trim()) params.set('q', search.trim());
    if (sort) params.set('sort', sort);
    if (usage) params.set('usage', usage);

    // Debounced so typing in the search box does not fire a request per keystroke
    const timer = setTimeout(() => {
      api
        .get<{ assets: MediaAsset[]; folders: MediaFolder[] }>(`/media?${params.toString()}`)
        .then((d) => {
          if (cancelled) return;
          setAssets(d.assets);
          setFolders(d.folders);
          setError(null);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the library');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, search ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [folderId, search, sort, usage, reloadKey]);

  const selected = useMemo(
    () => assets.find((a) => a.id === selectedId) ?? null,
    [assets, selectedId],
  );

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      await uploadFiles(Array.from(files));
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function newFolder() {
    const name = await prompt({
      title: 'New folder',
      description: 'Folders group images inside your library. They do not nest.',
      label: 'Folder name',
      placeholder: 'e.g. Winter campaign',
      confirmLabel: 'Create',
    });
    if (!name?.trim()) return;
    try {
      await api.post('/media/folders', { name: name.trim() });
      refresh();
    } catch (e) {
      await notify({
        title: 'Could not create folder',
        description: e instanceof Error ? e.message : 'Failed',
        tone: 'danger',
      });
    }
  }

  async function renameAsset(asset: MediaAsset) {
    const name = await prompt({
      title: 'Rename image',
      label: 'Name',
      defaultValue: asset.name,
      confirmLabel: 'Save',
    });
    if (!name?.trim() || name.trim() === asset.name) return;
    await api.patch(`/media/${asset.id}`, { name: name.trim() });
    refresh();
  }

  async function moveAsset(asset: MediaAsset, next: string) {
    await api.patch(`/media/${asset.id}`, { folderId: next || null });
    refresh();
  }

  async function removeAsset(asset: MediaAsset) {
    const ok = await confirm({
      title: `Remove "${asset.name}"?`,
      description:
        'It disappears from your library. The file itself stays where it is, so any page already using it keeps working.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/media/${asset.id}`);
      setSelectedId(null);
      refresh();
    } catch (e) {
      await notify({
        title: 'Could not remove',
        description: e instanceof Error ? e.message : 'Failed',
        tone: 'danger',
      });
    }
  }

  async function removeFolder(folder: MediaFolder) {
    const ok = await confirm({
      title: `Delete "${folder.name}"?`,
      description: 'The images inside it move back to Unfiled — nothing is lost.',
      confirmLabel: 'Delete folder',
      tone: 'danger',
    });
    if (!ok) return;
    await api.del(`/media/folders/${folder.id}`);
    if (folderId === folder.id) setFolderId('');
    refresh();
  }

  function copyUrl(url: string) {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const tabs = [
    { id: '', label: 'All', count: undefined as number | undefined },
    { id: 'none', label: 'Unfiled', count: undefined },
    ...folders.map((f) => ({ id: f.id, label: f.name, count: f._count?.assets })),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Gallery</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Every image you have uploaded. Reuse one on a product instead of uploading it again.
        </p>
      </div>

      {error && (
        <p className="animate-fade-up rounded-lg bg-sale/10 px-3 py-2 text-sm text-sale-strong">
          {error}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="card">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-ink/5 p-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="btn-primary btn-sm"
            >
              <Upload className="h-3.5 w-3.5" />
              {busy ? 'Uploading…' : 'Upload'}
            </button>
            <button type="button" onClick={newFolder} className="btn-ghost btn-sm">
              <FolderPlus className="h-3.5 w-3.5" />
              Create folder
            </button>

            <select
              className="input h-8 w-auto py-0 text-xs"
              value={usage}
              onChange={(e) => setUsage(e.target.value as UsageKey)}
              aria-label="Filter by use"
            >
              <option value="">All images</option>
              <option value="used">Used on a product</option>
              <option value="unused">Not used yet</option>
            </select>

            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input h-8 w-48 py-0 pl-8 text-xs"
                placeholder="Search images…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search images"
              />
            </div>
          </div>

          {/* Folder tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-ink/5 px-4 py-2.5">
            {tabs.map((t) => {
              const on = folderId === t.id;
              const folder = folders.find((f) => f.id === t.id);
              return (
                <span key={t.id || t.label} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setFolderId(t.id)}
                    aria-pressed={on}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] ${
                      on ? 'bg-primary/10 text-primary-strong' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {t.label}
                    {t.count !== undefined && (
                      <span className="ml-1.5 text-muted-foreground">{t.count}</span>
                    )}
                  </button>
                  {folder && on && (
                    <button
                      type="button"
                      onClick={() => removeFolder(folder)}
                      aria-label={`Delete folder ${folder.name}`}
                      className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-[background-color,transform] duration-200 ease-out hover:bg-sale/10 hover:text-sale active:scale-90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <select
                className="input h-8 w-auto py-0 text-xs"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sort"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name</option>
                <option value="largest">Largest</option>
              </select>
              <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="View">
                {(['grid', 'list'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    aria-label={`${v} view`}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-[background-color,color,transform] duration-200 ease-out active:scale-90 ${
                      view === v ? 'bg-surface text-ink shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    {v === 'grid' ? <Grid2x2 className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Files */}
          <div className="p-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">Nothing here yet</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  {search || usage || folderId
                    ? 'No image matches this filter.'
                    : 'Upload an image and it will appear here, ready to reuse on any product.'}
                </p>
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {assets.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    style={{ animationDelay: `${Math.min(i, 16) * 20}ms` }}
                    aria-pressed={selectedId === a.id}
                    className={`group animate-row-in overflow-hidden rounded-lg text-left ring-1 transition-[box-shadow,transform,ring-color] duration-200 ease-out hover:shadow-lift active:scale-[0.98] ${
                      selectedId === a.id ? 'ring-2 ring-primary' : 'ring-ink/10'
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
                    <div className="truncate px-2 py-1.5 text-xs" title={a.name}>
                      {a.name}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-ink/5">
                {assets.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    aria-pressed={selectedId === a.id}
                    className={`flex w-full items-center gap-3 px-2 py-2 text-left transition-[background-color] duration-200 ease-out hover:bg-muted ${
                      selectedId === a.id ? 'bg-primary/5' : ''
                    }`}
                  >
                    <img
                      src={a.url}
                      alt=""
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-ink/10"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                      {formatBytes(a.sizeBytes)}
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground md:block">
                      {formatDate(a.createdAt)}
                    </span>
                    {a.usedBy > 0 && <span className="badge-info shrink-0">{a.usedBy} in use</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="card h-fit p-5">
          {!selected ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Select an image to see its details.
            </p>
          ) : (
            <div className="animate-fade-up space-y-4">
              <div className="overflow-hidden rounded-lg bg-muted ring-1 ring-ink/10">
                <img src={selected.url} alt={selected.name} className="w-full object-contain" />
              </div>

              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="label mb-0">Name</p>
                    <p className="break-words text-sm">{selected.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => renameAsset(selected)}
                    className="btn-ghost btn-sm shrink-0"
                  >
                    Rename
                  </button>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Uploaded</dt>
                  <dd>{formatDate(selected.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>{formatBytes(selected.sizeBytes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Used by</dt>
                  <dd>
                    {selected.usedBy === 0
                      ? 'No products'
                      : `${selected.usedBy} product image${selected.usedBy === 1 ? '' : 's'}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{selected.mimeType?.replace('image/', '') ?? '—'}</dd>
                </div>
              </dl>

              <div>
                <label className="label" htmlFor="asset-folder">
                  Folder
                </label>
                <select
                  id="asset-folder"
                  className="input"
                  value={selected.folderId ?? ''}
                  onChange={(e) => moveAsset(selected, e.target.value)}
                >
                  <option value="">Unfiled</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="label">Full URL</span>
                <div className="flex items-center gap-2">
                  <input readOnly value={selected.url} className="input text-xs" />
                  <button
                    type="button"
                    onClick={() => copyUrl(selected.url)}
                    aria-label="Copy URL"
                    className="row-action shrink-0 hover:text-primary"
                  >
                    {copied ? <Check className="h-4 w-4 text-success-strong" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeAsset(selected)}
                className="btn-ghost btn-sm w-full text-sale hover:bg-sale/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove from library
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
