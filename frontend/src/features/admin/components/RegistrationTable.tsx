import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import type { RegistrationListItem, RegistrationStatus } from '../../../types/admin';

interface RegistrationTableProps {
  registrations: RegistrationListItem[];
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onRowClick: (registration: RegistrationListItem) => void;
  isLoading: boolean;
}

const REG_STATUS_BADGE: Record<RegistrationStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

type SortableColumn = {
  key: string;
  labelKey: string;
  sortable: boolean;
};

const COLUMNS: SortableColumn[] = [
  { key: 'name', labelKey: 'registration.table.name', sortable: true },
  { key: 'email', labelKey: 'registration.table.email', sortable: true },
  { key: 'createdAt', labelKey: 'registration.table.createdAt', sortable: true },
  { key: 'status', labelKey: 'registration.table.status', sortable: false },
  { key: 'processedAt', labelKey: 'registration.table.processedAt', sortable: false },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RegistrationTable({
  registrations,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  isLoading,
}: RegistrationTableProps) {
  const { t } = useTranslation('admin');

  function getAriaSort(field: string, sortable: boolean): 'ascending' | 'descending' | 'none' | undefined {
    if (!sortable) return undefined;
    if (sortField !== field) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                aria-sort={getAriaSort(col.key, col.sortable)}
                onClick={col.sortable ? () => onSort(col.key) : undefined}
                className={`text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 text-left select-none ${
                  col.sortable ? 'cursor-pointer hover:text-gray-900 dark:hover:text-gray-200' : ''
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {t(col.labelKey)}
                  {col.sortable && sortField === col.key && sortDirection === 'asc' && (
                    <ChevronUp className="w-4 h-4" />
                  )}
                  {col.sortable && sortField === col.key && sortDirection === 'desc' && (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && registrations.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
              </td>
            </tr>
          ) : registrations.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="py-12 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                {t('registration.emptyList')}
              </td>
            </tr>
          ) : (
            registrations.map((reg) => (
              <tr
                key={reg.id}
                onClick={() => onRowClick(reg)}
                className="text-sm text-gray-900 dark:text-gray-50 border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium">{reg.name}</td>
                <td className="px-4 py-3">{reg.email}</td>
                <td className="px-4 py-3">{formatDate(reg.createdAt)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${REG_STATUS_BADGE[reg.status] ?? ''}`}
                  >
                    {t(`registration.status.${reg.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {reg.processedAt ? formatDate(reg.processedAt) : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
