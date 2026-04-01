import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './features/auth/pages/LoginPage';
import { useAuthStore } from './stores/authStore';
import apiClient from './api/client';
import type { ApiResponse } from './types/api';
import type { RefreshResponse } from './types/auth';

function DashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">MiceSign</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Dashboard (coming soon)</p>
      </div>
    </div>
  );
}

function App() {
  const { setAuth, clearAuth } = useAuthStore();

  // On app mount, attempt silent refresh per D-14
  useEffect(() => {
    apiClient
      .post<ApiResponse<RefreshResponse>>('/auth/refresh')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setAuth(res.data.data.accessToken, res.data.data.user);
        } else {
          clearAuth();
        }
      })
      .catch(() => {
        // Silent failure per D-16 — redirect to login via clearAuth
        clearAuth();
      });
  }, [setAuth, clearAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPlaceholder />} />
        {/* /change-password will be added in Plan 04 */}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
