import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { AdminShops } from '@/pages/admin/Shops';
import { AdminCategories } from '@/pages/admin/Categories';
import { AdminCoupons } from '@/pages/admin/Coupons';
import { AdminOrders } from '@/pages/admin/Orders';
import { VendorDashboard } from '@/pages/vendor/Dashboard';
import { VendorProducts } from '@/pages/vendor/Products';
import { ProductForm } from '@/pages/vendor/ProductForm';
import { VendorOrders } from '@/pages/vendor/Orders';
import { ShopProfile } from '@/pages/vendor/ShopProfile';

function HomeRedirect() {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'SUPER_ADMIN' ? '/admin' : '/vendor'} replace />;
}

export function App() {
  return (
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
          <Route path="/admin/coupons" element={<AdminCoupons />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
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
          <Route path="/vendor/shop" element={<ShopProfile />} />
        </Route>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
