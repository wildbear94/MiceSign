import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Plus, Search, X } from 'lucide-react';
import DocumentListTable from '../components/DocumentListTable';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import Pagination from '../../admin/components/Pagination';
import { useMyDocuments, useSearchDocuments } from '../hooks/useDocuments';
import { DrafterCombo } from '../components/DrafterCombo';
import { StatusFilterPills } from '../components/StatusFilterPills';
import type { DocumentSearchParams, DocumentStatus } from '../types/document';

type TabMode = 'my' | 'search';

const STATUS_OPTIONS_MY = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;
const TEMPLATE_OPTIONS = ['', 'GENERAL', 'EXPENSE', 'LEAVE'] as const;

export default function DocumentListPage() {
  const { t } = useTranslation('document');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Derive filters from URL (single SoT)
  const filters = useMemo(() => {
    const tab = (searchParams.get('tab') ?? 'my') as TabMode;
    const statuses = searchParams.getAll('status') as DocumentStatus[];
    return {
      tab,
      keyword: searchParams.get('keyword') ?? '',
      statuses,
      templateCode: searchParams.get('templateCode') ?? '',
      dateFrom: searchParams.get('dateFrom') ?? '',
      dateTo: searchParams.get('dateTo') ?? '',
      drafterId: searchParams.get('drafterId'),
      page: Number(searchParams.get('page') ?? '0'),
    };
  }, [searchParams]);

  // Local keyword input for debounce source
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync local state when URL keyword changes externally (back/forward, link share)
  useEffect(() => {
    setKeywordInput(filters.keyword);
  }, [filters.keyword]);

  // Debounced keyword → URL (replace: true to avoid history thrashing per D-C3)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (keywordInput === filters.keyword) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (keywordInput) next.set('keyword', keywordInput);
          else next.delete('keyword');
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordInput, filters.keyword]);

  // Non-keyword filter updates (push history, reset page to 0 per D-C8)
  const updateFilter = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, value]) => {
          next.delete(key);
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (v !== null && v !== '') next.append(key, v);
            });
          } else if (value !== null && value !== '') {
            next.set(key, value);
          }
        });
        next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const changePage = useCallback(
    (newPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newPage === 0) next.delete('page');
        else next.set('page', String(newPage));
        return next;
      });
    },
    [setSearchParams],
  );

  const isSearchActive = filters.tab === 'search';

  // Build server query params (D-C5: frontend 'search' → backend 'all')
  const queryParams = useMemo<DocumentSearchParams>(() => {
    const params: DocumentSearchParams = { page: filters.page, size: 20, tab: filters.tab };
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.statuses.length > 0) params.statuses = filters.statuses;
    if (filters.templateCode) params.templateCode = filters.templateCode;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.drafterId) params.drafterId = Number(filters.drafterId);
    return params;
  }, [filters]);

  // tab=my: 단일 status 호환 유지 (기존 useMyDocuments 시그니처)
  const myDocsQuery = useMyDocuments({
    page: filters.page,
    size: 20,
    status: filters.statuses[0] as DocumentStatus | undefined,
  });
  const searchQuery = useSearchDocuments(queryParams, isSearchActive);

  const activeQuery = isSearchActive ? searchQuery : myDocsQuery;
  const data = activeQuery.data;
  const isLoading = activeQuery.isLoading;

  const handleRowClick = useCallback(
    (id: number) => {
      navigate(`/documents/${id}`);
    },
    [navigate],
  );

  const handleTemplateSelect = useCallback(
    (templateCode: string) => {
      navigate(`/documents/new/${templateCode}`);
    },
    [navigate],
  );

  const handleTabChange = useCallback(
    (tab: TabMode) => {
      updateFilter({ tab: tab === 'my' ? null : tab });
    },
    [updateFilter],
  );

  const handleClearFilters = useCallback(() => {
    setKeywordInput('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      // Keep tab; clear everything else
      const tab = next.get('tab');
      next.forEach((_v, k) => next.delete(k));
      if (tab) next.set('tab', tab);
      return next;
    });
  }, [setSearchParams]);

  const hasActiveFilters = !!(
    filters.keyword ||
    filters.statuses.length > 0 ||
    filters.templateCode ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.drafterId
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          {t('pageTitle')}
        </h1>
        <button
          type="button"
          onClick={() => setShowTemplateModal(true)}
          className="inline-flex items-center gap-2 h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {t('newDocument')}
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => handleTabChange('my')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filters.tab === 'my'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('tab.my')}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('search')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filters.tab === 'search'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('tab.search')}
        </button>
      </div>

      {/* tab=my: 단일 상태 필터만 간단히 제공 */}
      {!isSearchActive && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('filter.status')}
          </label>
          <select
            value={filters.statuses[0] ?? ''}
            onChange={(e) => updateFilter({ status: e.target.value || null })}
            className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS_MY.map((s) => (
              <option key={s} value={s}>
                {s ? t(`status.${s}`) : t('filter.all')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Search/filter bar - only visible in search mode */}
      {isSearchActive && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
          {/* Keyword */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full pl-10 pr-4 h-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status pills (복수) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('filter.status')}
            </label>
            <StatusFilterPills
              value={filters.statuses}
              onChange={(statuses) => updateFilter({ status: statuses })}
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-3 items-end">
            {/* Template */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('filter.template')}
              </label>
              <select
                value={filters.templateCode}
                onChange={(e) => updateFilter({ templateCode: e.target.value || null })}
                className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TEMPLATE_OPTIONS.map((tc) => (
                  <option key={tc} value={tc}>
                    {tc ? t(`template.${tc}`) : t('filter.all')}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('filter.dateFrom')}
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter({ dateFrom: e.target.value || null })}
                className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('filter.dateTo')}
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter({ dateTo: e.target.value || null })}
                className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Drafter combo */}
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('filter.drafter', { defaultValue: '기안자' })}
              </label>
              <DrafterCombo
                value={filters.drafterId}
                onChange={(id) => updateFilter({ drafterId: id ? String(id) : null })}
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 h-9 px-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                초기화
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !data && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {data && data.content.length === 0 && (
        <div className="text-center py-20">
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            {t('emptyState.title')}
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            {t('emptyState.description')}
          </p>
        </div>
      )}

      {/* Table */}
      {data && data.content.length > 0 && (
        <>
          <DocumentListTable documents={data.content} onRowClick={handleRowClick} />
          <Pagination
            currentPage={data.number}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onPageChange={changePage}
          />
        </>
      )}

      {/* Template selection modal */}
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}
