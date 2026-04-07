import type { NotificationLogFilter } from '../types/notification';

interface NotificationLogFiltersProps {
  filter: NotificationLogFilter;
  onFilterChange: (filter: NotificationLogFilter) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'PENDING', label: '대기중' },
  { value: 'SENT', label: '발송완료' },
  { value: 'FAILED', label: '실패' },
];

const EVENT_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'APPROVAL_REQUESTED', label: 'APPROVAL_REQUESTED' },
  { value: 'DOCUMENT_APPROVED', label: 'DOCUMENT_APPROVED' },
  { value: 'DOCUMENT_REJECTED', label: 'DOCUMENT_REJECTED' },
  { value: 'DOCUMENT_WITHDRAWN', label: 'DOCUMENT_WITHDRAWN' },
  { value: 'REFERENCE_ADDED', label: 'REFERENCE_ADDED' },
];

export default function NotificationLogFilters({
  filter,
  onFilterChange,
}: NotificationLogFiltersProps) {
  const handleChange = (key: keyof NotificationLogFilter, value: string) => {
    onFilterChange({ ...filter, [key]: value || undefined });
  };

  const handleReset = () => {
    onFilterChange({});
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            상태
          </label>
          <select
            value={filter.status ?? ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            이벤트
          </label>
          <select
            value={filter.eventType ?? ''}
            onChange={(e) => handleChange('eventType', e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
