import { Navigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import type { AuthUser } from '@/store/auth';

export function ProtectedRoute({
  roles,
  children,
}: {
  roles: AuthUser['role'][];
  children: React.ReactNode;
}) {
  const { token, user } = useAuth();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === 'SUPER_ADMIN' ? '/admin' : '/vendor'} replace />;
  }
  return <>{children}</>;
}
