import { NavLink, Link } from 'react-router';
import { Building2, Award, Users, UserPlus, X, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../stores/authStore';
import { usePendingRegistrationCount } from '../hooks/useRegistrations';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { t } = useTranslation('admin');
  const { user } = useAuthStore();
  const { data: pendingCount } = usePendingRegistrationCount();

  const navItems = [
    { to: '/admin/departments', icon: Building2, labelKey: 'sidebar.departments' },
    { to: '/admin/positions', icon: Award, labelKey: 'sidebar.positions' },
    { to: '/admin/users', icon: Users, labelKey: 'sidebar.users' },
    ...(user?.role === 'SUPER_ADMIN'
      ? [{ to: '/admin/registrations', icon: UserPlus, labelKey: 'registration.title' }]
      : []),
  ];

  const navContent = (
    <nav className="flex flex-col gap-1 p-3">
      <Link
        to="/"
        className="flex items-center gap-2 px-4 py-3 mb-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span className="hidden xl:inline">대시보드로 돌아가기</span>
      </Link>
      {navItems.map(({ to, icon: Icon, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onClose}
          title={t(labelKey)}
          className={({ isActive }) =>
            `px-4 py-4 flex items-center gap-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="hidden xl:inline">{t(labelKey)}</span>
          {to === '/admin/registrations' && pendingCount != null && pendingCount > 0 && (
            <span className="hidden xl:inline-flex bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center ml-auto">
              {pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar: hidden below lg, icon-only on lg, full on xl+ */}
      <aside className="hidden lg:flex lg:w-16 xl:w-60 flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full shrink-0">
        {navContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 lg:hidden">
            <div className="flex items-center justify-end p-3">
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-3">
              <Link
                to="/"
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-3 mb-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>대시보드로 돌아가기</span>
              </Link>
              {navItems.map(({ to, icon: Icon, labelKey }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `px-4 py-4 flex items-center gap-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{t(labelKey)}</span>
                  {to === '/admin/registrations' && pendingCount != null && pendingCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center ml-auto">
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
