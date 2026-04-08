import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import DocumentListTable from '../components/DocumentListTable';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import Pagination from '../../admin/components/Pagination';
import { useMyDocuments } from '../hooks/useDocuments';

export default function DocumentListPage() {
  const { t } = useTranslation('document');
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const { data, isLoading } = useMyDocuments({ page, size: 20 });

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
