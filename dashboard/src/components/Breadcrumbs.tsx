import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { navFor, routeLabels } from './nav';
import { useAuth } from '@/store/auth';

/** Turn "products" / "abandoned" into "Products" / "Abandoned". */
function titleCase(segment: string) {
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

/**
 * Derived from the URL rather than passed down per page, so a new route gets
 * breadcrumbs for free. Known paths use their nav label; anything else falls
 * back to a title-cased segment (ids are shown as "#abc123").
 */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const role = useAuth((s) => s.user?.role);
  const groups = navFor(role);

  const labelFor = (path: string, segment: string) => {
    if (routeLabels[path]) return routeLabels[path];
    for (const group of groups) {
      const hit = group.items.find((i) => i.to === path);
      if (hit) return hit.label;
    }
    // cuid-ish segment → show it as an id rather than a title-cased blob
    return /^[a-z0-9]{20,}$/i.test(segment) ? `#${segment.slice(-6)}` : titleCase(segment);
  };

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((segment, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    return { path, label: labelFor(path, segment) };
  });

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              {last ? (
                <span aria-current="page" className="truncate font-medium">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="truncate text-muted-foreground transition-colors duration-200 hover:text-ink"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
