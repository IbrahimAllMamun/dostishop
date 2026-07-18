export type Money = string | number;

export interface Shop {
  id: string;
  name: string;
  slug: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  commissionRate?: Money;
  createdAt?: string;
  owner?: { id: string; name: string; email: string };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  sortOrder: number;
}

export interface ProductImage {
  id?: string;
  url: string;
  alt?: string | null;
  sortOrder?: number;
}

export interface Variant {
  id?: string;
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
  categoryId?: string | null;
  basePrice: Money;
  salePrice?: Money | null;
  isActive: boolean;
  isFeatured: boolean;
  images?: ProductImage[];
  variants?: Variant[];
}

export interface OrderItem {
  id: string;
  productName: string;
  variantLabel?: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface SubOrder {
  id: string;
  status: string;
  paymentStatus: string;
  subtotal: Money;
  shippingCost: Money;
  commissionAmount: Money;
  vendorPayout: Money;
  trackingNo?: string | null;
  createdAt: string;
  shop?: { name: string; slug: string };
  items?: OrderItem[];
  order?: {
    orderNo: string;
    customerName: string;
    phone: string;
    address: string;
    city: string;
    zone: string;
    paymentMethod: string;
    createdAt: string;
  };
}

export interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  phone: string;
  grandTotal: Money;
  paymentMethod: string;
  createdAt: string;
  subOrders: Array<{ id: string; status: string; shop?: { name: string } }>;
}

export interface AbandonedCheckout {
  id: string;
  customerName?: string | null;
  phone: string;
  items: Array<{ name: string; qty: number; price: number }>;
  subtotal: Money;
  status: 'OPEN' | 'RECOVERED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  customerName: string;
  phone: string;
  rating: number;
  comment?: string | null;
  orderNo?: string | null;
  isVerified: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  photos: Array<{ id: string; url: string }>;
  product?: { name: string; slug: string };
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: Money;
  minOrder: Money;
  usageLimit?: number | null;
  usageCount: number;
  expiresAt?: string | null;
  isActive: boolean;
}
