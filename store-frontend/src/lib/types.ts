export type Money = string | number;

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  phone?: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  sortOrder: number;
}

export interface Variant {
  id: string;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  priceOverride?: Money | null;
  stockQty: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  basePrice: Money;
  salePrice?: Money | null;
  isFeatured: boolean;
  images: ProductImage[];
  variants?: Variant[];
  shop?: { name: string; slug: string } | null;
  category?: { name: string; slug: string } | null;
}

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl?: string | null;
  title?: string | null;
}

export interface Settings {
  storeName: string;
  shippingInsideDhaka: Money;
  shippingOutsideDhaka: Money;
  supportPhone?: string | null;
  supportEmail?: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface SubOrder {
  id: string;
  status: string;
  paymentStatus: string;
  subtotal: Money;
  shippingCost: Money;
  trackingNo?: string | null;
  shop?: { name: string; slug: string };
  items?: Array<{
    id: string;
    productName: string;
    variantLabel?: string | null;
    unitPrice: Money;
    quantity: number;
    lineTotal: Money;
  }>;
}

export interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  zone: string;
  paymentMethod: string;
  subtotal: Money;
  shippingTotal: Money;
  grandTotal: Money;
  createdAt: string;
  subOrders: SubOrder[];
}
