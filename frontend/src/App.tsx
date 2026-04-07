import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ForcePasswordChangeGuard from './components/ForcePasswordChangeGuard';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './features/admin/components/AdminLayout';
import DepartmentPage from './features/admin/pages/DepartmentPage';
import PositionPage from './features/admin/pages/PositionPage';
import UserListPage from './features/admin/pages/UserListPage';
import UserDetailPage from './features/admin/pages/UserDetailPage';
import DocumentListPage from './features/document/pages/DocumentListPage';
import DocumentEditorPage from './features/document/pages/DocumentEditorPage';
import DocumentDetailPage from './features/document/pages/DocumentDetailPage';
import PendingApprovalsPage from './features/approval/pages/PendingApprovalsPage';
import CompletedDocumentsPage from './features/approval/pages/CompletedDocumentsPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import AuditLogPage from './features/audit/pages/AuditLogPage';
import NotificationLogPage from './features/notification/pages/NotificationLogPage';
import TemplateListPage from './features/admin/pages/TemplateListPage';
import TemplateBuilderPage from './features/admin/pages/TemplateBuilderPage';
import LoginPage from './features/auth/pages/LoginPage';
import ChangePasswordPage from './features/auth/pages/ChangePasswordPage';
import { useAuthStore } from './stores/authStore';
import apiClient from './api/client';
import type { ApiResponse } from './types/api';
import type { RefreshResponse } from './types/auth';

function App() {
  const { setAuth, clearAuth } = useAuthStore();
  const refreshCalled = useRef(false);

  // On app mount, attempt silent refresh per D-14
  // useRef guard prevents StrictMode double-invocation from causing
  // concurrent refresh token rotation race conditions
  useEffect(() => {
    if (refreshCalled.current) return;
    refreshCalled.current = true;

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
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/documents/my" element={<DocumentListPage />} />
          <Route path="/documents/new/:templateCode" element={<DocumentEditorPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/approvals/pending" element={<PendingApprovalsPage />} />
          <Route path="/approvals/completed" element={<CompletedDocumentsPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="departments" element={<DepartmentPage />} />
            <Route path="positions" element={<PositionPage />} />
            <Route path="users" element={<UserListPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="audit-logs" element={<AuditLogPage />} />
            <Route path="notifications" element={<NotificationLogPage />} />
            <Route path="templates" element={<TemplateListPage />} />
            <Route path="templates/:id/builder" element={<TemplateBuilderPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
