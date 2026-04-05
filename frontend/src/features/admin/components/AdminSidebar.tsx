import { NavLink } from 'react-router';
import { Building2, Award, Users, ScrollText, Mail, LayoutTemplate, X, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/admin/departments', icon: Building2, labelKey: 'sidebar.departments' },
  { to: '/admin/positions', icon: Award, labelKey: 'sidebar.positions' },
  { to: '/admin/users', icon: Users, labelKey: 'sidebar.users' },
  { to: '/admin/audit-logs', icon: ScrollText, labelKey: 'sidebar.auditLogs' },
  { to: '/admin/notifications', icon: Mail, labelKey: 'sidebar.notifications' },
  { to: '/admin/templates', icon: LayoutTemplate, labelKey: 'sidebar.templates' },
] as const;

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { t } = useTranslation('admin');

  const navContent = (
    <nav className="flex flex-col gap-1 p-3">
      <NavLink
        to="/documents/my"
        className="px-4 py-3 flex items-center gap-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mb-2 border-b border-gray-200 dark:border-gray-700 pb-3"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span className="hidden xl:inline">{t('sidebar.backToDocuments', '문서 목록')}</span>
      </NavLink>
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
              <NavLink
                to="/documents/my"
                onClick={onClose}
                className="px-4 py-3 flex items-center gap-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mb-2 border-b border-gray-200 dark:border-gray-700 pb-3"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>{t('sidebar.backToDocuments', '문서 목록')}</span>
              </NavLink>
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
                </NavLink>
              ))}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
