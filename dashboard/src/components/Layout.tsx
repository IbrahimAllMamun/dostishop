import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronsLeft,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationBell } from './NotificationBell';
import { navFor, type NavGroup } from './nav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const COLLAPSE_KEY = 'boutique-dashboard-sidebar-collapsed';

function NavLinks({ groups, collapsed, onNavigate }: {
  groups: NavGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.heading}>
          {/* The heading disappears when collapsed; the grouping still reads
              through the gap between blocks. */}
          {!collapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.heading}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.98] ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lift'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground'
                  }`
                }
              >
                <item.icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && <span className="sr-only">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        B
      </span>
      {!collapsed && (
        <span className="truncate text-lg font-bold">
          Boutique<span className="text-gold">BD</span>
        </span>
      )}
    </div>
  );
}

/** Mobile navigation. Portals to <body>: the sticky header uses backdrop-blur,
 *  which makes it the containing block for `position: fixed` and would
 *  otherwise trap this drawer inside the header's height. */
function MobileDrawer({ groups, onClose }: { groups: NavGroup[]; onClose: () => void }) {
  const [closing, setClosing] = useState(false);

  function requestClose() {
    setClosing(true);
    setTimeout(onClose, 160); // matches `drawer-out`
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        onClick={requestClose}
        aria-hidden
        className={`absolute inset-0 bg-ink/50 backdrop-blur-sm ${
          closing ? 'animate-out fade-out-0 duration-150' : 'animate-in fade-in-0 duration-200'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`absolute inset-y-0 left-0 flex w-[min(80vw,17rem)] flex-col overflow-y-auto bg-sidebar px-3 py-4 text-sidebar-foreground ${
          closing ? 'animate-drawer-out' : 'animate-drawer-in'
        }`}
      >
        <div className="flex items-center justify-between pb-6 pl-2">
          <Brand collapsed={false} />
          <button onClick={requestClose} aria-label="Close navigation" className="row-action text-sidebar-foreground/70 hover:bg-sidebar-foreground/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavLinks groups={groups} collapsed={false} onNavigate={requestClose} />
      </aside>
    </div>,
    document.body,
  );
}

export function Layout() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const theme = useTheme((s) => s.theme);
  const isDark = useTheme((s) => s.resolved) === 'dark';
  const toggleTheme = useTheme((s) => s.toggle);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const groups = navFor(user?.role);

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // A route change should never leave the drawer hanging open
  useEffect(() => setDrawerOpen(false), [pathname]);

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar. Width is the one layout property we animate — it is a
          single container, not a list, and the collapse has no other honest
          expression. Everything else in this app animates transform/opacity. */}
      <aside
        className={`hidden shrink-0 flex-col overflow-y-auto bg-sidebar px-3 py-4 text-sidebar-foreground transition-[width] duration-200 ease-settle lg:flex ${
          collapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        <div className={`flex items-center pb-6 ${collapsed ? 'justify-center' : 'justify-between pl-2'}`}>
          <Brand collapsed={collapsed} />
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="row-action text-sidebar-foreground/60 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        <NavLinks groups={groups} collapsed={collapsed} />

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="row-action mt-6 self-center text-sidebar-foreground/60 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
          >
            <ChevronsLeft className="h-4 w-4 rotate-180" />
          </button>
        )}
      </aside>

      {drawerOpen && <MobileDrawer groups={groups} onClose={() => setDrawerOpen(false)} />}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink/10 bg-surface/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="row-action lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Breadcrumbs />

          <div className="ml-auto flex items-center gap-1.5">
            {/* Search is presentational until the search endpoint lands */}
            <label className="relative hidden md:block">
              <span className="sr-only">Search</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                placeholder="Search…"
                className="input w-56 pl-9 lg:w-72"
              />
            </label>

            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
              title={theme === 'system' ? 'Following your system theme' : undefined}
              className="row-action hover:text-ink"
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-left transition-colors duration-200 hover:bg-muted">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {user?.name?.slice(0, 1).toUpperCase() ?? '?'}
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block max-w-36 truncate text-sm font-medium">{user?.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {user?.role === 'SUPER_ADMIN' ? 'Admin' : (user?.shop?.name ?? 'Vendor')}
                  </span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{user?.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() =>
                    navigate(user?.role === 'SUPER_ADMIN' ? '/admin/settings' : '/vendor/shop')
                  }
                >
                  {user?.role === 'SUPER_ADMIN' ? (
                    <Settings className="mr-2 h-4 w-4" />
                  ) : (
                    <User className="mr-2 h-4 w-4" />
                  )}
                  {user?.role === 'SUPER_ADMIN' ? 'Settings' : 'Shop profile'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="text-sale focus:text-sale">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
