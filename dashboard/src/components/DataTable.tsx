import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Inbox, Search } from 'lucide-react';
import { TableSkeleton } from './Skeleton';

export interface Column<T> {
  /** Stable key — also the sort key when `sortable` and no `sortValue` given */
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Value used for sorting and for the built-in search */
  value?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  /** Applied to both the th and the td, for alignment/width */
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  /** Placeholder in the search box; omit the box entirely with `search={false}` */
  searchPlaceholder?: string;
  search?: boolean;
  /** Extra controls rendered on the right of the toolbar */
  toolbar?: ReactNode;
  /** Rendered instead of the table when there are no rows at all */
  empty?: ReactNode;
  /** Enables the checkbox column; receives the currently selected ids */
  bulkActions?: (selected: string[], clear: () => void) => ReactNode;
  pageSizes?: number[];
  initialPageSize?: number;
}

type Sort = { key: string; dir: 'asc' | 'desc' } | null;

/**
 * One table for every list in the dashboard: search, page size, pagination,
 * sorting, optional row selection with a bulk-action bar.
 *
 * Filtering and paging are client-side — every list here is a single API call
 * of at most a few hundred rows. If one outgrows that, the props stay the same
 * and the internals move server-side.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading,
  onRowClick,
  searchPlaceholder = 'Search…',
  search = true,
  toolbar,
  empty,
  bulkActions,
  pageSizes = [10, 25, 50],
  initialPageSize = 10,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>(null);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const searchable = useMemo(() => columns.filter((c) => c.value), [columns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      searchable.some((c) => String(c.value!(row) ?? '').toLowerCase().includes(q)),
    );
  }, [rows, query, searchable]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return filtered;
    // Copy first — sorting `filtered` in place would mutate `rows` when unfiltered
    return [...filtered].sort((a, b) => {
      const av = col.value!(a);
      const bv = col.value!(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort, columns]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Searching or resizing can strand you past the last page
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const pageIds = paged.map(getRowId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const clearSelection = () => setSelected([]);

  function toggleSort(key: string) {
    setSort((s) =>
      s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' },
    );
  }

  const colCount = columns.length + (bulkActions ? 1 : 0);
  const showToolbar = search || toolbar;

  return (
    <div className="card overflow-hidden">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-ink/5 px-4 py-3">
          {search && (
            <label className="relative min-w-48 flex-1 sm:max-w-xs">
              <span className="sr-only">{searchPlaceholder}</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="input pl-9"
              />
            </label>
          )}
          {toolbar && <div className="ml-auto flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {bulkActions && selected.length > 0 && (
        <div className="flex animate-fade-up flex-wrap items-center gap-3 border-b border-ink/5 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selected.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions(selected, clearSelection)}
          </div>
          <button onClick={clearSelection} className="ml-auto text-sm text-muted-foreground hover:text-ink">
            Clear
          </button>
        </div>
      )}

      {/* Wide tables scroll inside their own container — the page never does */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/5">
              {bulkActions && (
                <th scope="col" className="th w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allOnPageSelected}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...new Set([...s, ...pageIds])]
                          : s.filter((id) => !pageIds.includes(id)),
                      )
                    }
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`th ${col.className ?? ''}`}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  {col.sortable && col.value ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 uppercase tracking-wide transition-colors duration-200 hover:text-ink"
                    >
                      {col.header}
                      <ChevronsUpDown
                        aria-hidden
                        className={`h-3 w-3 ${sort?.key === col.key ? 'text-primary' : 'opacity-40'}`}
                      />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={colCount} />
            ) : total === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-14">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Inbox aria-hidden className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {query ? `Nothing matches “${query}”.` : (empty ?? 'Nothing here yet.')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row, i) => {
                const id = getRowId(row);
                const isSelected = selected.includes(id);
                return (
                  <tr
                    key={id}
                    // Rows settle in as the page lands; capped so a 50-row page
                    // does not spend 2.5s dribbling content onto the screen
                    style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                    {...(onRowClick
                      ? {
                          tabIndex: 0,
                          role: 'button',
                          onClick: () => onRowClick(row),
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          },
                        }
                      : {})}
                    className={`animate-row-in border-b border-ink/5 transition-colors duration-150 last:border-0 ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                    } ${
                      onRowClick
                        ? 'cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
                        : ''
                    }`}
                  >
                    {bulkActions && (
                      <td className="td" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${id}`}
                          checked={isSelected}
                          onChange={(e) =>
                            setSelected((s) =>
                              e.target.checked ? [...s, id] : s.filter((x) => x !== id),
                            )
                          }
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`td ${col.className ?? ''}`}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-ink/5 px-4 py-3 text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            Show
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="input w-auto py-1 text-sm"
            >
              {pageSizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <p className="text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>

          {pageCount > 1 && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="row-action disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span aria-live="polite" className="px-2 text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                aria-label="Next page"
                className="row-action disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
