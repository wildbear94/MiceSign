import { Navigate } from 'react-router';
import { useAuthStore } from '../stores/authStore';
import SplashScreen from './SplashScreen';

/**
 * Route guard for the /change-password page.
 * Allows authenticated users (including those with mustChangePassword=true) to access the page.
 * Redirects unauthenticated users to /login.
 * Unlike ProtectedRoute, does NOT redirect mustChangePassword users away.
 */
export default function ForcePasswordChangeGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
