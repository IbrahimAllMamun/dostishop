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
  imageUrl?: string | null;
  /** Lucide icon name, shown when there is no imageUrl */
  icon?: string | null;
  /** Vendor who created it; null for seeded or admin-created categories */
  createdById?: string | null;
  /** An admin has curated it — the original vendor can no longer change it */
  adminLocked?: boolean;
  _count?: { products: number };
}

export interface ProductImage {
  id?: string;
  url: string;
  alt?: string | null;
  sortOrder?: number;
}

export interface AttributeValue {
  id: string;
  attributeId: string;
  value: string;
  sortOrder: number;
  /** How many variants carry this value — deleting one that is in use fails */
  _count?: { variants: number };
}

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  values: AttributeValue[];
  /** Vendor who created it; null for seeded or admin-created attributes */
  createdById?: string | null;
  /** An admin has curated it — the original vendor can no longer change it */
  adminLocked?: boolean;
  _count?: { values: number };
}

export interface Variant {
  id?: string;
  sku?: string | null;
  /** Denormalised copies of the Size/Color values — derived on the server */
  size?: string | null;
  color?: string | null;
  /** The normalised definition: which attribute values this variant carries */
  attributes?: Array<{ valueId: string }>;
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
  createdAt?: string;
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

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl?: string | null;
  title?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Settings {
  id: string;
  storeName: string;
  shippingInsideDhaka: Money;
  shippingOutsideDhaka: Money;
  supportPhone?: string | null;
  supportEmail?: string | null;
}

export interface Payout {
  id: string;
  shopId: string;
  periodFrom: string;
  periodTo: string;
  gross: Money;
  commission: Money;
  net: Money;
  status: 'PENDING' | 'PAID';
  createdAt: string;
  shop?: { name: string; slug: string };
  _count?: { subOrders: number };
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
