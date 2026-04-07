import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import type { DocumentSearchParams, DocumentStatus, Template } from '../types/document';

interface DocumentSearchFiltersProps {
  params: DocumentSearchParams;
  onParamsChange: (params: Partial<DocumentSearchParams>) => void;
  templates: Template[];
}

const STATUS_OPTIONS: { value: DocumentStatus | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'DRAFT', label: '임시저장' },
  { value: 'SUBMITTED', label: '상신' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'WITHDRAWN', label: '회수' },
];

export default function DocumentSearchFilters({
  params,
  onParamsChange,
  templates,
}: DocumentSearchFiltersProps) {
  const [keyword, setKeyword] = useState(params.keyword ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync keyword when params change externally (e.g. clear all)
  useEffect(() => {
    setKeyword(params.keyword ?? '');
  }, [params.keyword]);

  const debouncedSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onParamsChange({ keyword: value || undefined });
      }, 300);
    },
    [onParamsChange],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleKeywordChange(value: string) {
    setKeyword(value);
    debouncedSearch(value);
  }

  function handleClearAll() {
    setKeyword('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onParamsChange({
      keyword: undefined,
      status: undefined,
      templateCode: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  }

  const hasFilters =
    !!params.keyword ||
    !!params.status ||
    !!params.templateCode ||
    !!params.dateFrom ||
    !!params.dateTo;

  const selectClass =
    'h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-3">
      {/* Keyword search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          placeholder="문서 제목, 문서번호로 검색..."
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status dropdown */}
        <select
          value={params.status ?? ''}
          onChange={(e) =>
            onParamsChange({
              status: (e.target.value as DocumentStatus) || undefined,
            })
          }
          className={selectClass}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Template dropdown */}
        <select
          value={params.templateCode ?? ''}
          onChange={(e) =>
            onParamsChange({ templateCode: e.target.value || undefined })
          }
          className={selectClass}
        >
          <option value="">모든 양식</option>
          {templates.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>

        {/* Date range */}
        <input
          type="date"
          value={params.dateFrom ?? ''}
          onChange={(e) =>
            onParamsChange({ dateFrom: e.target.value || undefined })
          }
          className={selectClass}
        />
        <span className="text-gray-400 text-sm">~</span>
        <input
          type="date"
          value={params.dateTo ?? ''}
          onChange={(e) =>
            onParamsChange({ dateTo: e.target.value || undefined })
          }
          className={selectClass}
        />

        {/* Clear all filters */}
        {hasFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            className="h-10 px-3 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
            초기화
          </button>
        )}
      </div>
    </div>
  );
}
