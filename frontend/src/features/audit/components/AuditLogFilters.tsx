import type { AuditLogFilter } from '../types/audit';

interface AuditLogFiltersProps {
  filter: AuditLogFilter;
  onFilterChange: (filter: AuditLogFilter) => void;
}

const ACTION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGOUT', label: 'LOGOUT' },
  { value: 'DOCUMENT_CREATE', label: 'DOCUMENT_CREATE' },
  { value: 'DOCUMENT_SUBMIT', label: 'DOCUMENT_SUBMIT' },
  { value: 'DOCUMENT_APPROVE', label: 'DOCUMENT_APPROVE' },
  { value: 'DOCUMENT_REJECT', label: 'DOCUMENT_REJECT' },
  { value: 'DOCUMENT_WITHDRAW', label: 'DOCUMENT_WITHDRAW' },
  { value: 'USER_CREATE', label: 'USER_CREATE' },
  { value: 'USER_UPDATE', label: 'USER_UPDATE' },
];

export default function AuditLogFilters({ filter, onFilterChange }: AuditLogFiltersProps) {
  const handleChange = (key: keyof AuditLogFilter, value: string) => {
    if (key === 'userId') {
      const num = value ? Number(value) : undefined;
      onFilterChange({ ...filter, userId: num });
    } else {
      onFilterChange({ ...filter, [key]: value || undefined });
    }
  };

  const handleReset = () => {
    onFilterChange({});
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Action */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            행동
          </label>
          <select
            value={filter.action ?? ''}
            onChange={(e) => handleChange('action', e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* User ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            사용자 ID
          </label>
          <input
            type="number"
            value={filter.userId ?? ''}
            onChange={(e) => handleChange('userId', e.target.value)}
            placeholder="사용자 ID"
            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            시작일
          </label>
          <input
            type="date"
            value={filter.startDate ?? ''}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            종료일
          </label>
          <input
            type="date"
            value={filter.endDate ?? ''}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={handleReset}
          className="h-10 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={() => onFilterChange({ ...filter })}
          className="h-10 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          검색
        </button>
      </div>
    </div>
  );
}
