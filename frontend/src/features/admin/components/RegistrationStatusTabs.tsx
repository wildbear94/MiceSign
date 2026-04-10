import { useTranslation } from 'react-i18next';
import type { RegistrationStatus } from '../../../types/admin';

interface RegistrationStatusTabsProps {
  activeStatus: RegistrationStatus | undefined;
  onChange: (status: RegistrationStatus | undefined) => void;
}

const TABS: { key: RegistrationStatus | undefined; labelKey: string }[] = [
  { key: undefined, labelKey: 'registration.tabs.all' },
  { key: 'PENDING', labelKey: 'registration.tabs.pending' },
  { key: 'APPROVED', labelKey: 'registration.tabs.approved' },
  { key: 'REJECTED', labelKey: 'registration.tabs.rejected' },
  { key: 'EXPIRED', labelKey: 'registration.tabs.expired' },
  { key: 'CANCELLED', labelKey: 'registration.tabs.cancelled' },
];

export default function RegistrationStatusTabs({
  activeStatus,
  onChange,
}: RegistrationStatusTabsProps) {
  const { t } = useTranslation('admin');

  return (
    <div
      role="tablist"
      className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700"
    >
      {TABS.map((tab) => {
        const isActive = activeStatus === tab.key;
        return (
          <button
            key={tab.key ?? 'all'}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2 text-sm whitespace-nowrap ${
              isActive
                ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
