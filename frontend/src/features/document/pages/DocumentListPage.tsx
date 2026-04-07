import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import DocumentTabs from '../components/DocumentTabs';
import DocumentSearchFilters from '../components/DocumentSearchFilters';
import DocumentListTable from '../components/DocumentListTable';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import Pagination from '../../admin/components/Pagination';
import { useSearchDocuments } from '../hooks/useDocuments';
import { useDocumentSearchParams } from '../hooks/useDocumentSearchParams';
import { useAuthStore } from '../../../stores/authStore';
import type { SearchTab, DocumentStatus } from '../types/document';

export default function DocumentListPage() {
  const { t } = useTranslation('document');
  const navigate = useNavigate();

  const [searchState, updateSearchState] = useDocumentSearchParams();
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const searchParams = {
    tab: searchState.tab,
    ...(searchState.keyword && { keyword: searchState.keyword }),
    ...(searchState.status && { status: searchState.status as DocumentStatus }),
    ...(searchState.templateCode && { templateCode: searchState.templateCode }),
    ...(searchState.startDate && { startDate: searchState.startDate }),
    ...(searchState.endDate && { endDate: searchState.endDate }),
    page: searchState.page,
    size: 20,
  };
  const { data, isLoading } = useSearchDocuments(searchParams);

  const hasFilters =
    searchState.keyword ||
    searchState.status ||
    searchState.templateCode ||
    searchState.startDate ||
    searchState.endDate;

  const handleTabChange = useCallback(
    (tab: SearchTab) => {
      // Redirect non-admin from ALL tab
      const user = useAuthStore.getState().user;
      if (tab === 'ALL' && user?.role === 'USER') {
        updateSearchState({
          tab: 'MY',
          keyword: '',
          status: '',
          templateCode: '',
          startDate: '',
          endDate: '',
          page: 0,
        });
        return;
      }
      updateSearchState({
        tab,
        keyword: '',
        status: '',
        templateCode: '',
        startDate: '',
        endDate: '',
        page: 0,
      });
    },
    [updateSearchState],
  );

  const handleSearch = useCallback(
    (filters: {
      keyword: string;
      status: string;
      templateCode: string;
      startDate: string;
      endDate: string;
    }) => {
      updateSearchState({ ...filters, page: 0 });
    },
    [updateSearchState],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateSearchState({ page: newPage });
    },
    [updateSearchState],
  );

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

      {/* Tabs */}
      <DocumentTabs activeTab={searchState.tab} onTabChange={handleTabChange} />

      {/* Search and Filters */}
      <DocumentSearchFilters
        keyword={searchState.keyword}
        status={searchState.status}
        templateCode={searchState.templateCode}
        startDate={searchState.startDate}
        endDate={searchState.endDate}
        onSearch={handleSearch}
      />

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
          {hasFilters ? (
            <>
              <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                검색 결과가 없습니다
              </p>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                검색어를 변경하거나 필터 조건을 조정해보세요
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                아직 문서가 없습니다
              </p>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                새 문서를 작성해보세요
              </p>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {data && data.content.length > 0 && (
        <>
          <DocumentListTable
            documents={data.content}
            onRowClick={handleRowClick}
            keyword={searchState.keyword}
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
