import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DialogsProvider } from '@/components/Dialogs';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { AdminShops } from '@/pages/admin/Shops';
import { AdminCategories } from '@/pages/admin/Categories';
import { AdminCoupons } from '@/pages/admin/Coupons';
import { AdminReviews } from '@/pages/admin/Reviews';
import { AdminAbandoned } from '@/pages/admin/Abandoned';
import { AdminBanners } from '@/pages/admin/Banners';
import { AdminSettings } from '@/pages/admin/Settings';
import { AdminPayouts } from '@/pages/admin/Payouts';
import { VendorPayouts } from '@/pages/vendor/Payouts';
import { VendorCategories } from '@/pages/vendor/Categories';
import { AdminOrders } from '@/pages/admin/Orders';
import { VendorDashboard } from '@/pages/vendor/Dashboard';
import { VendorProducts } from '@/pages/vendor/Products';
import { ProductForm } from '@/pages/vendor/ProductForm';
import { VendorOrders } from '@/pages/vendor/Orders';
import { VendorAnalytics } from '@/pages/vendor/Analytics';
import { ShopProfile } from '@/pages/vendor/ShopProfile';
import { Attributes } from '@/pages/Attributes';
import { AdminOrderDetail } from '@/pages/admin/OrderDetail';
import { AdminReport } from '@/pages/admin/Report';
import { VendorOrderDetail } from '@/pages/vendor/OrderDetail';

function HomeRedirect() {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'SUPER_ADMIN' ? '/admin' : '/vendor'} replace />;
}

export function App() {
  return (
    <DialogsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Super admin */}
          <Route
            element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/shops" element={<AdminShops />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/attributes" element={<Attributes />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/abandoned" element={<AdminAbandoned />} />
            <Route path="/admin/banners" element={<AdminBanners />} />
            <Route path="/admin/payouts" element={<AdminPayouts />} />
            <Route path="/admin/report" element={<AdminReport />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
          </Route>

          {/* Vendor */}
          <Route
            element={
              <ProtectedRoute roles={['VENDOR']}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/vendor" element={<VendorDashboard />} />
            <Route path="/vendor/products" element={<VendorProducts />} />
            <Route path="/vendor/products/new" element={<ProductForm />} />
            <Route path="/vendor/products/:id/edit" element={<ProductForm />} />
            <Route path="/vendor/orders" element={<VendorOrders />} />
            <Route path="/vendor/orders/:id" element={<VendorOrderDetail />} />
            <Route path="/vendor/analytics" element={<VendorAnalytics />} />
            <Route path="/vendor/payouts" element={<VendorPayouts />} />
            <Route path="/vendor/categories" element={<VendorCategories />} />
            <Route path="/vendor/attributes" element={<Attributes />} />
            <Route path="/vendor/shop" element={<ShopProfile />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </DialogsProvider>
  );
}
