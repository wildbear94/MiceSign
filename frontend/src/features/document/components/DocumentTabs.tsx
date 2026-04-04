import { useAuthStore } from '../../../stores/authStore';
import type { SearchTab } from '../types/document';

const TABS: { key: SearchTab; label: string; adminOnly?: boolean }[] = [
  { key: 'MY', label: '내 문서' },
  { key: 'APPROVAL', label: '결재함' },
  { key: 'ALL', label: '전체', adminOnly: true },
];

interface DocumentTabsProps {
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
}

export default function DocumentTabs({ activeTab, onTabChange }: DocumentTabsProps) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6" role="tablist">
      {TABS.filter((t) => !t.adminOnly || isAdmin).map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2 text-sm border-b-2 ${
            activeTab === tab.key
              ? 'font-semibold text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
