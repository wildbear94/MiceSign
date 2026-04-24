import { useNavigate } from 'react-router';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TemplateBadge from '../../document/components/TemplateBadge';
import DocumentStatusBadge from '../../document/components/DocumentStatusBadge';
import ErrorState from './ErrorState';
import type { RecentDocumentSummary } from '../types/dashboard';

interface RecentDocumentsListProps {
  data: RecentDocumentSummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Phase 31 D-B2 — props-based 리팩터.
 * 단일 useDashboardSummary 훅 호출(상위 DashboardPage)이 recentDocuments 평평한 배열을 props 로 전달.
 * D-C2 — isError 시 공통 ErrorState(variant='list') 로 교체.
 */
export default function RecentDocumentsList({ data, isLoading, isError }: RecentDocumentsListProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          {t('recentDocuments')}
        </h2>
        <button
          onClick={() => navigate('/documents/my')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none rounded"
        >
          {t('viewAll')}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3" role="status" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-4" aria-hidden="true">
              <div className="h-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && isError && <ErrorState variant="list" />}

      {/* Empty */}
      {!isLoading && !isError && data && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('emptyRecent')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('emptyRecentDesc')}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && data && data.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 pb-2">제목</th>
              <th className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 pb-2">양식</th>
              <th className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 pb-2">상태</th>
              <th className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 pb-2">작성일</th>
            </tr>
          </thead>
          <tbody>
            {data.map((doc) => (
              <tr
                key={doc.id}
                data-testid={`recent-row-${doc.id}`}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/documents/${doc.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/documents/${doc.id}`);
                }}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer focus-visible:bg-gray-50 dark:focus-visible:bg-gray-800/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                <td className="py-2 text-sm text-gray-900 dark:text-gray-50 max-w-[200px] truncate">
                  {doc.title}
                </td>
                <td className="py-2">
                  <TemplateBadge templateCode={doc.templateCode} />
                </td>
                <td className="py-2">
                  <DocumentStatusBadge status={doc.status} />
                </td>
                <td className="py-2 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
