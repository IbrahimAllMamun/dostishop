import type {
  Banner,
  Category,
  Order,
  Pagination,
  Product,
  Review,
  ReviewStats,
  Settings,
  Shop,
} from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...init });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${path} -> ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function getCategories(): Promise<Category[]> {
  const d = await api<{ categories: Category[] }>('/categories');
  return d.categories;
}

export async function getBanners(): Promise<Banner[]> {
  const d = await api<{ banners: Banner[] }>('/banners');
  return d.banners;
}

export async function getSettings(): Promise<Settings | null> {
  const d = await api<{ settings: Settings | null }>('/settings');
  return d.settings;
}

export interface ProductListParams {
  category?: string;
  shop?: string;
  search?: string;
  featured?: boolean;
  sort?: string;
  page?: number;
}

export async function getProducts(
  params: ProductListParams = {},
): Promise<{ products: Product[]; pagination: Pagination }> {
  const q = new URLSearchParams();
  if (params.category) q.set('category', params.category);
  if (params.shop) q.set('shop', params.shop);
  if (params.search) q.set('search', params.search);
  if (params.featured) q.set('featured', 'true');
  if (params.sort) q.set('sort', params.sort);
  if (params.page) q.set('page', String(params.page));
  return api<{ products: Product[]; pagination: Pagination }>(`/products?${q.toString()}`);
}

export async function getProduct(slug: string): Promise<Product> {
  const d = await api<{ product: Product }>(`/products/slug/${slug}`);
  return d.product;
}

export async function getShop(slug: string): Promise<Shop> {
  const d = await api<{ shop: Shop }>(`/shops/${slug}`);
  return d.shop;
}

export async function getShops(): Promise<Shop[]> {
  const d = await api<{ shops: Shop[] }>('/shops');
  return d.shops;
}

// Client-side mutations
export interface CheckoutPayload {
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  zone: 'inside_dhaka' | 'outside_dhaka';
  note?: string;
  couponCode?: string;
  paymentMethod: 'COD';
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
}

export async function validateCoupon(
  code: string,
  subtotal: number,
): Promise<{ code: string; discount: number }> {
  const res = await fetch(`${API_BASE}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'Invalid coupon');
  return data;
}

export async function postCheckout(payload: CheckoutPayload): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'Checkout failed');
  return data.order as Order;
}

export async function getProductReviews(
  productId: string,
): Promise<{ reviews: Review[]; stats: ReviewStats }> {
  return api<{ reviews: Review[]; stats: ReviewStats }>(`/reviews/product/${productId}`);
}

export interface ReviewPayload {
  productId: string;
  rating: number;
  comment?: string;
  customerName: string;
  phone: string;
  orderNo?: string;
  photos?: string[];
}

export async function postReview(
  payload: ReviewPayload,
): Promise<{ message: string; isVerified: boolean }> {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'Failed to submit review');
  return data;
}

export async function uploadReviewPhoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/uploads/review`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
  return data.url as string;
}

export async function trackOrder(orderNo: string, phone: string): Promise<Order> {
  const res = await fetch(
    `${API_BASE}/orders/track?orderNo=${encodeURIComponent(orderNo)}&phone=${encodeURIComponent(phone)}`,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'Order not found');
  return data.order as Order;
}
