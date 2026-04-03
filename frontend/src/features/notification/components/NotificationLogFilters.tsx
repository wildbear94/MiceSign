import { useState } from 'react';
import { NOTIFICATION_STATUSES, NOTIFICATION_EVENT_TYPES } from '../types/notification';
import type { NotificationLogFilter } from '../types/notification';

interface NotificationLogFiltersProps {
  filter: NotificationLogFilter;
  onFilterChange: (filter: NotificationLogFilter) => void;
}

export default function NotificationLogFilters({
  filter,
  onFilterChange,
}: NotificationLogFiltersProps) {
  const [localFilter, setLocalFilter] = useState<NotificationLogFilter>(filter);

  const handleSearch = () => {
    const cleaned: NotificationLogFilter = {};
    if (localFilter.status) cleaned.status = localFilter.status;
    if (localFilter.eventType) cleaned.eventType = localFilter.eventType;
    if (localFilter.startDate) cleaned.startDate = localFilter.startDate;
    if (localFilter.endDate) cleaned.endDate = localFilter.endDate;
    onFilterChange(cleaned);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const inputStyle =
    'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div>
        <label htmlFor="notification-status" className="sr-only">
          상태
        </label>
        <select
          id="notification-status"
          value={localFilter.status ?? ''}
          onChange={(e) =>
            setLocalFilter((prev) => ({ ...prev, status: e.target.value || undefined }))
          }
          className={inputStyle}
        >
          <option value="">모든 상태</option>
          {NOTIFICATION_STATUSES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="notification-event-type" className="sr-only">
          이벤트 유형
        </label>
        <select
          id="notification-event-type"
          value={localFilter.eventType ?? ''}
          onChange={(e) =>
            setLocalFilter((prev) => ({ ...prev, eventType: e.target.value || undefined }))
          }
          onKeyDown={handleKeyDown}
          className={inputStyle}
        >
          <option value="">모든 이벤트</option>
          {NOTIFICATION_EVENT_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="notification-start-date" className="sr-only">
          시작일
        </label>
        <input
          id="notification-start-date"
          type="date"
          value={localFilter.startDate ?? ''}
          onChange={(e) =>
            setLocalFilter((prev) => ({ ...prev, startDate: e.target.value || undefined }))
          }
          onKeyDown={handleKeyDown}
          className={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="notification-end-date" className="sr-only">
          종료일
        </label>
        <input
          id="notification-end-date"
          type="date"
          value={localFilter.endDate ?? ''}
          onChange={(e) =>
            setLocalFilter((prev) => ({ ...prev, endDate: e.target.value || undefined }))
          }
          onKeyDown={handleKeyDown}
          className={inputStyle}
        />
      </div>

      <button
        type="button"
        onClick={handleSearch}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
      >
        검색
      </button>
    </div>
  );
}
