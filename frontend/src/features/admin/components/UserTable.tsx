import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { UserListItem } from '../../../types/admin';

interface UserTableProps {
  users: UserListItem[];
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onRowClick: (userId: number) => void;
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  USER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  RETIRED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

type SortableColumn = {
  key: string;
  labelKey: string;
};

const COLUMNS: SortableColumn[] = [
  { key: 'employeeNo', labelKey: 'users.employeeNo' },
  { key: 'name', labelKey: 'users.name' },
  { key: 'email', labelKey: 'users.email' },
  { key: 'departmentName', labelKey: 'users.department' },
  { key: 'positionName', labelKey: 'users.position' },
  { key: 'role', labelKey: 'users.role' },
  { key: 'status', labelKey: 'users.status' },
];

export default function UserTable({
  users,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
}: UserTableProps) {
  const { t } = useTranslation('admin');

  function getAriaSort(field: string): 'ascending' | 'descending' | 'none' {
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
                aria-sort={getAriaSort(col.key)}
                onClick={() => onSort(col.key)}
                className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 text-left select-none"
              >
                <span className="inline-flex items-center gap-1">
                  {t(col.labelKey)}
                  {sortField === col.key && sortDirection === 'asc' && (
                    <ChevronUp className="w-4 h-4" />
                  )}
                  {sortField === col.key && sortDirection === 'desc' && (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="text-center py-12 text-sm text-gray-500 dark:text-gray-400"
              >
                {t('users.emptyList')}
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr
                key={user.id}
                onClick={() => onRowClick(user.id)}
                className="text-sm text-gray-900 dark:text-gray-50 border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              >
                <td className="px-4 py-3">{user.employeeNo}</td>
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.departmentName}</td>
                <td className="px-4 py-3">{user.positionName ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${ROLE_BADGE[user.role] ?? ''}`}>
                    {t(`users.roles.${user.role}`)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_BADGE[user.status] ?? ''}`}>
                    {t(`users.statuses.${user.status}`)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
