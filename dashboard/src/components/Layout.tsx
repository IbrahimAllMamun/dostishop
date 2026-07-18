import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';

const adminNav = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/shops', label: 'Shops' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/banners', label: 'Banners' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/abandoned', label: 'Abandoned carts' },
  { to: '/admin/payouts', label: 'Payouts' },
  { to: '/admin/settings', label: 'Settings' },
];

const vendorNav = [
  { to: '/vendor', label: 'Overview', end: true },
  { to: '/vendor/products', label: 'Products' },
  { to: '/vendor/orders', label: 'Orders' },
  { to: '/vendor/analytics', label: 'Analytics' },
  { to: '/vendor/payouts', label: 'Payouts' },
  { to: '/vendor/shop', label: 'Shop profile' },
];

export function Layout() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const nav = user?.role === 'SUPER_ADMIN' ? adminNav : vendorNav;

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-ink px-4 py-6 text-white/90 sm:flex">
        <div className="px-2 pb-6 text-xl font-bold">
          Boutique<span className="text-gold">BD</span>
        </div>
        <p className="px-2 pb-2 text-xs uppercase tracking-wide text-white/40">
          {user?.role === 'SUPER_ADMIN' ? 'Admin' : 'Vendor'}
        </p>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink/10 bg-surface px-6 py-3">
          {/* mobile nav */}
          <nav className="flex gap-3 overflow-x-auto sm:hidden">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap text-sm ${isActive ? 'text-primary' : 'text-muted'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted">
              {user?.name}
              {user?.shop ? ` · ${user.shop.name}` : ''}
            </span>
            <button onClick={signOut} className="btn-ghost btn-sm">
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
