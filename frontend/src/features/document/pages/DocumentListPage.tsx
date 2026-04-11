import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Plus, Search, X } from 'lucide-react';
import DocumentListTable from '../components/DocumentListTable';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import Pagination from '../../admin/components/Pagination';
import { useMyDocuments, useSearchDocuments } from '../hooks/useDocuments';
import type { DocumentSearchParams } from '../types/document';

type TabMode = 'my' | 'search';

const STATUS_OPTIONS = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;
const TEMPLATE_OPTIONS = ['', 'GENERAL', 'EXPENSE', 'LEAVE'] as const;

export default function DocumentListPage() {
  const { t } = useTranslation('document');
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Search/filter state
  const [activeTab, setActiveTab] = useState<TabMode>('my');
  const [keywordInput, setKeywordInput] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce keyword input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(keywordInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [keywordInput]);

  // Determine if search mode has active filters
  const isSearchActive = activeTab === 'search';

  const searchParams = useMemo<DocumentSearchParams>(() => {
    const params: DocumentSearchParams = { page, size: 20, tab: 'my' };
    if (debouncedKeyword) params.keyword = debouncedKeyword;
    if (statusFilter) params.status = statusFilter;
    if (templateFilter) params.templateCode = templateFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [page, debouncedKeyword, statusFilter, templateFilter, dateFrom, dateTo]);

  const myDocsQuery = useMyDocuments({ page, size: 20 });
  const searchQuery = useSearchDocuments(searchParams, isSearchActive);

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

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleTabChange = useCallback((tab: TabMode) => {
    setActiveTab(tab);
    setPage(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setKeywordInput('');
    setDebouncedKeyword('');
    setStatusFilter('');
    setTemplateFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  }, []);

  const hasActiveFilters = !!(debouncedKeyword || statusFilter || templateFilter || dateFrom || dateTo);

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
            activeTab === 'my'
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
            activeTab === 'search'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('tab.search')}
        </button>
      </div>

      {/* Search/filter bar - only visible in search mode */}
      {isSearchActive && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
          {/* Keyword search row */}
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

          {/* Filter row */}
          <div className="flex flex-wrap gap-3 items-end">
            {/* Status filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('filter.status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s ? t(`status.${s}`) : t('filter.all')}
                  </option>
                ))}
              </select>
            </div>

            {/* Template filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('filter.template')}
              </label>
              <select
                value={templateFilter}
                onChange={(e) => { setTemplateFilter(e.target.value); setPage(0); }}
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
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
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
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Clear filters */}
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
          <DocumentListTable
            documents={data.content}
            onRowClick={handleRowClick}
          />
          <Pagination
            currentPage={data.number}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onPageChange={handlePageChange}
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
