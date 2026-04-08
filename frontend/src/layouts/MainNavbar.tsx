import { NavLink, useNavigate } from 'react-router';
import { LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../api/client';

export default function MainNavbar() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Logout failure is non-blocking
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between">
      {/* Left: Logo */}
      <NavLink to="/" className="text-lg font-bold text-gray-900 dark:text-gray-50">
        MiceSign
      </NavLink>

      {/* Center: Nav links */}
      <nav className="flex items-center gap-1">
        <NavLink
          to="/documents/my"
          className={({ isActive }) =>
            `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          내 문서
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/admin/departments"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
          >
            <Settings className="h-4 w-4" />
            관리
          </NavLink>
        )}
      </nav>

      {/* Right: User info + logout */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {user?.name}
        </span>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="로그아웃"
          title="로그아웃"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
