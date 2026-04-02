import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { DepartmentTreeNode, UserFilterParams } from '../../../types/admin';

interface UserFilterBarProps {
  filters: UserFilterParams;
  onChange: (filters: UserFilterParams) => void;
  departments: DepartmentTreeNode[];
}

/** Flatten a department tree into a flat list for select options */
function flattenDepartments(nodes: DepartmentTreeNode[]): { id: number; name: string }[] {
  const result: { id: number; name: string }[] = [];
  function walk(list: DepartmentTreeNode[]) {
    for (const node of list) {
      if (node.isActive) {
        result.push({ id: node.id, name: node.name });
      }
      walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

export default function UserFilterBar({ filters, onChange, departments }: UserFilterBarProps) {
  const { t } = useTranslation('admin');
  const [keyword, setKeyword] = useState(filters.keyword ?? '');

  // Debounce keyword search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword !== (filters.keyword ?? '')) {
        onChange({ ...filters, keyword: keyword || undefined, page: 0 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]); // eslint-disable-line react-hooks/exhaustive-deps

  const flatDepts = flattenDepartments(departments);

  const selectClass =
    'h-9 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600';

  const handleReset = () => {
    setKeyword('');
    onChange({ page: 0, size: filters.size });
  };

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {/* Department filter */}
      <select
        value={filters.departmentId ?? ''}
        onChange={(e) =>
          onChange({
            ...filters,
            departmentId: e.target.value ? Number(e.target.value) : undefined,
            page: 0,
          })
        }
        className={selectClass}
      >
        <option value="">{t('users.filterDepartment')}</option>
        {flatDepts.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>

      {/* Role filter */}
      <select
        value={filters.role ?? ''}
        onChange={(e) =>
          onChange({
            ...filters,
            role: (e.target.value as UserFilterParams['role']) || undefined,
            page: 0,
          })
        }
        className={selectClass}
      >
        <option value="">{t('users.filterRole')}</option>
        <option value="SUPER_ADMIN">{t('users.roles.SUPER_ADMIN')}</option>
        <option value="ADMIN">{t('users.roles.ADMIN')}</option>
        <option value="USER">{t('users.roles.USER')}</option>
      </select>

      {/* Status filter */}
      <select
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({
            ...filters,
            status: (e.target.value as UserFilterParams['status']) || undefined,
            page: 0,
          })
        }
        className={selectClass}
      >
        <option value="">{t('users.filterStatus')}</option>
        <option value="ACTIVE">{t('users.statuses.ACTIVE')}</option>
        <option value="INACTIVE">{t('users.statuses.INACTIVE')}</option>
        <option value="RETIRED">{t('users.statuses.RETIRED')}</option>
      </select>

      {/* Keyword search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t('users.searchPlaceholder')}
          className="h-9 text-sm border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 w-64"
        />
      </div>

      {/* Reset button */}
      <button
        type="button"
        onClick={handleReset}
        className="h-9 px-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      >
        {t('common.reset')}
      </button>
    </div>
  );
}
