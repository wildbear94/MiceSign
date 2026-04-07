import { useState } from 'react';
import { AUDIT_ACTIONS } from '../types/audit';
import type { AuditLogFilter } from '../types/audit';

interface AuditLogFiltersProps {
  filter: AuditLogFilter;
  onFilterChange: (filter: AuditLogFilter) => void;
}

export default function AuditLogFilters({ filter, onFilterChange }: AuditLogFiltersProps) {
  const [localFilter, setLocalFilter] = useState<AuditLogFilter>(filter);

  const handleSearch = () => {
    // Strip empty string values before passing to parent
    const cleaned: AuditLogFilter = {};
    if (localFilter.action) cleaned.action = localFilter.action;
    if (localFilter.userId) cleaned.userId = localFilter.userId;
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
        <label htmlFor="audit-action" className="sr-only">
          액션 유형
        </label>
        <select
          id="audit-action"
          value={localFilter.action ?? ''}
          onChange={(e) => setLocalFilter((prev) => ({ ...prev, action: e.target.value || undefined }))}
          className={inputStyle}
        >
          <option value="">모든 액션</option>
          {AUDIT_ACTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="audit-user-id" className="sr-only">
          사용자 ID
        </label>
        <input
          id="audit-user-id"
          type="number"
          placeholder="사용자 ID"
          value={localFilter.userId ?? ''}
          onChange={(e) =>
            setLocalFilter((prev) => ({
              ...prev,
              userId: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          onKeyDown={handleKeyDown}
          className={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="audit-start-date" className="sr-only">
          시작일
        </label>
        <input
          id="audit-start-date"
          type="date"
          value={localFilter.startDate ?? ''}
          onChange={(e) =>
            setLocalFilter((prev) => ({ ...prev, startDate: e.target.value || undefined }))
          }
          className={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="audit-end-date" className="sr-only">
          종료일
        </label>
        <input
          id="audit-end-date"
          type="date"
          value={localFilter.endDate ?? ''}
          onChange={(e) =>
            setLocalFilter((prev) => ({ ...prev, endDate: e.target.value || undefined }))
          }
          className={inputStyle}
        />
      </div>

      <button
        type="button"
        onClick={handleSearch}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        검색
      </button>
    </div>
  );
}
