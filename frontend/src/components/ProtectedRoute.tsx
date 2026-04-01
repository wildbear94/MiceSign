import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../stores/authStore';
import SplashScreen from './SplashScreen';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
