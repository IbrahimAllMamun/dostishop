import {
  BarChart3,
  Image,
  LayoutDashboard,
  ListTree,
  Package,
  SlidersHorizontal,
  Receipt,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Ticket,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

/** Grouped rather than one flat list — twelve equal-weight links read as noise. */
export const adminNav: NavGroup[] = [
  {
    heading: 'Main',
    items: [{ to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true }],
  },
  {
    heading: 'Catalog',
    items: [
      { to: '/admin/shops', label: 'Shops', icon: Store },
      { to: '/admin/categories', label: 'Categories', icon: ListTree },
      { to: '/admin/attributes', label: 'Attributes', icon: SlidersHorizontal },
      { to: '/admin/banners', label: 'Banners', icon: Image },
    ],
  },
  {
    heading: 'Sales',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
      { to: '/admin/abandoned', label: 'Abandoned carts', icon: Receipt },
      { to: '/admin/payouts', label: 'Payouts', icon: Wallet },
      { to: '/admin/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    heading: 'System',
    items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }],
  },
];

export const vendorNav: NavGroup[] = [
  {
    heading: 'Main',
    items: [
      { to: '/vendor', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/vendor/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { to: '/vendor/products', label: 'Products', icon: Package },
      { to: '/vendor/categories', label: 'Categories', icon: ListTree },
      { to: '/vendor/attributes', label: 'Attributes', icon: SlidersHorizontal },
    ],
  },
  {
    heading: 'Sales',
    items: [
      { to: '/vendor/orders', label: 'Orders', icon: ShoppingBag },
      { to: '/vendor/payouts', label: 'Payouts', icon: Wallet },
    ],
  },
  {
    heading: 'Shop',
    items: [{ to: '/vendor/shop', label: 'Shop profile', icon: Store }],
  },
];

/** Extra route labels the nav itself doesn't carry, for breadcrumbs. */
export const routeLabels: Record<string, string> = {
  '/vendor/products/new': 'New product',
  '/admin': 'Overview',
  '/vendor': 'Overview',
};

export function navFor(role: string | undefined): NavGroup[] {
  return role === 'SUPER_ADMIN' ? adminNav : vendorNav;
}
