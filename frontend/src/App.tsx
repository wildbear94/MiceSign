import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ForcePasswordChangeGuard from './components/ForcePasswordChangeGuard';
import AdminLayout from './features/admin/components/AdminLayout';
import DepartmentPage from './features/admin/pages/DepartmentPage';
import PositionPage from './features/admin/pages/PositionPage';
import UserListPage from './features/admin/pages/UserListPage';
import LoginPage from './features/auth/pages/LoginPage';
import ChangePasswordPage from './features/auth/pages/ChangePasswordPage';
import { useAuthStore } from './stores/authStore';
import apiClient from './api/client';
import type { ApiResponse } from './types/api';
import type { RefreshResponse } from './types/auth';

function AdminPlaceholder() {
  return <div className="text-gray-500">Loading...</div>;
}

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
      <Route
        path="/change-password"
        element={
          <ForcePasswordChangeGuard>
            <ChangePasswordPage />
          </ForcePasswordChangeGuard>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPlaceholder />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="departments" element={<DepartmentPage />} />
            <Route path="positions" element={<PositionPage />} />
            <Route path="users" element={<UserListPage />} />
            <Route path="users/:id" element={<AdminPlaceholder />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
