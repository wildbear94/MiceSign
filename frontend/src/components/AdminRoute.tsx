import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../stores/authStore';

export default function AdminRoute() {
  const { user } = useAuthStore();

  if (!user || user.role === 'USER') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
