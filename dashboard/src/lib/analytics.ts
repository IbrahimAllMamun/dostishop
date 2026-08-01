/** Shapes returned by /analytics/admin and /analytics/vendor. */

export interface DailyPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface RankedProduct {
  productId: string;
  name: string;
  revenue: number;
  unitsSold: number;
}

export interface AdminAnalytics {
  range: string;
  summary: {
    revenue: number;
    commission: number;
    orders: number;
    avgOrderValue: number;
    customers: number;
    trend: { revenue: number | null; commission: number | null; orders: number | null };
  };
  shops: Record<string, number>;
  daily: DailyPoint[];
  byCategory: Array<{ name: string; revenue: number }>;
  topProducts: RankedProduct[];
  topShops: Array<{ shopId: string; name: string; slug?: string; revenue: number; orders: number }>;
  topCustomers: Array<{ phone: string; name: string; orders: number; spent: number }>;
}

export interface VendorAnalytics {
  range: string;
  summary: {
    revenue: number;
    payout: number;
    orders: number;
    avgOrderValue: number;
    trend: { revenue: number | null; orders: number | null; payout: number | null };
  };
  byStatus: Array<{ status: string; count: number }>;
  daily: DailyPoint[];
  topProducts: RankedProduct[];
}
