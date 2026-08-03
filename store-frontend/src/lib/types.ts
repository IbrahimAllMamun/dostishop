export type Money = string | number;

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  parentId?: string | null;
  sortOrder?: number;
}

export interface CategoryNode extends Category {
  children: Category[];
}

/** Flat list -> two-level tree (top-level categories with their children). */
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const tops = categories.filter((c) => !c.parentId);
  return tops.map((t) => ({
    ...t,
    children: categories.filter((c) => c.parentId === t.id),
  }));
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

export interface AttributeValueRef {
  id: string;
  value: string;
  /** Present on values of a colour attribute — what the swatch is painted in */
  color?: { name: string; hexCode: string } | null;
  attribute: { name: string; slug: string; kind?: 'TEXT' | 'COLOR' };
}

export interface VariantAttributeValue {
  value: AttributeValueRef;
}

export interface Variant {
  id: string;
  sku?: string | null;
  /** Denormalised copies, kept for cart labels and legacy CSV-imported rows */
  size?: string | null;
  color?: string | null;
  /** The normalised definition — one entry per attribute this variant fixes */
  attributes?: VariantAttributeValue[];
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
  ratingAvg?: Money;
  ratingCount?: number;
  unitsSold?: number;
  discountPct?: number;
  images: ProductImage[];
  variants?: Variant[];
  /** Specification attributes — facts about the product, never a choice */
  specValues?: Array<{ value: AttributeValueRef }>;
  shop?: { name: string; slug: string } | null;
  category?: { name: string; slug: string } | null;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment?: string | null;
  isVerified: boolean;
  createdAt: string;
  photos: Array<{ url: string }>;
}

export interface ReviewStats {
  avg: number;
  count: number;
  distribution: Record<number, number>;
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
