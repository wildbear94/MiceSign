import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, FileText } from 'lucide-react';
import DocumentTabs from '../components/DocumentTabs';
import DocumentSearchFilters from '../components/DocumentSearchFilters';
import DocumentListTable from '../components/DocumentListTable';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import Pagination from '../../admin/components/Pagination';
import { useSearchDocuments } from '../hooks/useDocuments';
import { useActiveTemplates } from '../hooks/useTemplates';
import {
  useDocumentSearchParams,
  toSearchParams,
} from '../hooks/useDocumentSearchParams';
import { useAuthStore } from '../../../stores/authStore';
import { useState } from 'react';
import type { DocumentListItem, Template } from '../types/document';

const BASE_TABS = [
  { key: 'my', label: '전체' },
];

const STATUS_TABS = [
  { key: 'DRAFT', label: '임시저장' },
  { key: 'SUBMITTED', label: '상신중' },
  { key: 'APPROVED', label: '승인' },
  { key: 'REJECTED', label: '반려' },
  { key: 'WITHDRAWN', label: '회수' },
];

export default function DocumentListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [searchState, updateSearch] = useDocumentSearchParams();
  const searchParams = useMemo(() => toSearchParams(searchState), [searchState]);

  const { data, isLoading, isError } = useSearchDocuments(searchParams);
  const { data: templates } = useActiveTemplates();

  // Build tabs based on user role
  const tabs = useMemo(() => {
    const result = [...BASE_TABS];

    // ADMIN sees department tab
    if (user?.role === 'ADMIN') {
      result.push({ key: 'department', label: '부서' });
    }

    // SUPER_ADMIN sees all tab
    if (user?.role === 'SUPER_ADMIN') {
      result.push({ key: 'department', label: '부서' });
      result.push({ key: 'all', label: '전체 (관리자)' });
    }

    return result;
  }, [user?.role]);

  // Current active status tab (separate from the scope tab)
  const [statusFilter, setStatusFilter] = useState<string>('');

  const statusTabs = useMemo(() => {
    return [
      { key: '', label: '전체' },
      ...STATUS_TABS,
    ];
  }, []);

  const handleTabChange = useCallback(
    (tab: string) => {
      updateSearch({ tab: tab as 'my' | 'department' | 'all', page: 0 });
    },
    [updateSearch],
  );

  const handleStatusTabChange = useCallback(
    (status: string) => {
      setStatusFilter(status);
      updateSearch({
        status: status || undefined,
        page: 0,
      } as Parameters<typeof updateSearch>[0]);
    },
    [updateSearch],
  );

  const handleRowClick = useCallback(
    (doc: DocumentListItem) => {
      navigate(`/documents/${doc.id}`);
    },
    [navigate],
  );

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      setShowTemplateModal(false);
      navigate(`/documents/new/${template.code}`);
    },
    [navigate],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateSearch({ page });
    },
    [updateSearch],
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          내 문서
        </h1>
        <button
          type="button"
          onClick={() => setShowTemplateModal(true)}
          className="inline-flex items-center gap-2 h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 문서 작성
        </button>
      </div>

      {/* Scope tabs (my / department / all) */}
      {tabs.length > 1 && (
        <div className="mb-4">
          <DocumentTabs
            activeTab={searchState.tab}
            onTabChange={handleTabChange}
            tabs={tabs}
          />
        </div>
      )}

      {/* Status filter tabs */}
      <div className="mb-4">
        <DocumentTabs
          activeTab={statusFilter}
          onTabChange={handleStatusTabChange}
          tabs={statusTabs}
        />
      </div>

      {/* Search filters */}
      <div className="mb-4">
        <DocumentSearchFilters
          params={searchParams}
          onParamsChange={(partial) => updateSearch(partial as Parameters<typeof updateSearch>[0])}
          templates={templates ?? []}
        />
      </div>

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

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          문서 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data && data.content.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <FileText className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium mb-1">문서가 없습니다</p>
          <p className="text-sm">새 문서를 작성하여 시작해보세요.</p>
        </div>
      )}

      {/* Table + Pagination */}
      {data && data.content.length > 0 && (
        <>
          <DocumentListTable
            documents={data.content}
            keyword={searchState.keyword}
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
        templates={templates ?? []}
      />
    </div>
  );
}
