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

export type NotificationType =
  | 'ORDER_PLACED'
  | 'SHOP_APPROVED'
  | 'PAYOUT_SETTLED'
  | 'LOW_STOCK';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  /** Dashboard path this notification opens */
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

/** A folder in the shop's media library. Flat — folders do not nest. */
export interface MediaFolder {
  id: string;
  name: string;
  _count?: { assets: number };
}

export interface MediaAsset {
  id: string;
  url: string;
  name: string;
  folderId?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  updatedAt: string;
  /** Product images pointing at this URL — non-zero blocks deletion */
  usedBy: number;
}

/** A colour in the shared palette: a name and the hex the swatch is painted in. */
export interface Color {
  id: string;
  name: string;
  hexCode: string;
  sortOrder: number;
  createdById?: string | null;
  adminLocked?: boolean;
  /** How many attribute values reference it — deleting one in use fails */
  _count?: { values: number };
}

export type AttributeKind = 'TEXT' | 'COLOR';

export interface AttributeValue {
  id: string;
  attributeId: string;
  value: string;
  sortOrder: number;
  /** Set on values of a COLOR attribute; null on text ones */
  colorId?: string | null;
  color?: { id: string; name: string; hexCode: string } | null;
  /** How many variants and products carry this value — deleting one in use fails */
  _count?: { variants: number; productSpecs?: number };
}

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  /** TEXT values are typed; COLOR values are picked from the palette */
  kind: AttributeKind;
  /** True: a variant axis. False: a product specification, stated once. */
  isVariant: boolean;
  sortOrder: number;
  values: AttributeValue[];
  /** Vendor who created it; null for seeded or admin-created attributes */
  createdById?: string | null;
  /** An admin has curated it — the original vendor can no longer change it */
  adminLocked?: boolean;
  _count?: { values: number; products?: number };
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
  /** Which attributes this product uses — variant axes and specs alike */
  attributes?: Array<{ attributeId: string }>;
  /** Chosen values for the spec (non-variant) attributes above */
  specValues?: Array<{ valueId: string }>;
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

export interface SubOrderEvent {
  id: string;
  subOrderId: string;
  status: string;
  note?: string | null;
  createdById?: string | null;
  createdAt: string;
}

export interface SubOrder {
  id: string;
  status: string;
  events?: SubOrderEvent[];
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
  address?: string;
  city?: string;
  zone?: string;
  discountTotal?: Money | null;
  grandTotal: Money;
  paymentMethod: string;
  createdAt: string;
  /** The list endpoint returns a thin shape; the detail endpoint fills it in */
  subOrders: SubOrder[];
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
