import { useNavigate } from 'react-router';
import { ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePendingPreview } from '../hooks/useDashboard';
import TemplateBadge from '../../document/components/TemplateBadge';

export default function PendingList() {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = usePendingPreview();

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          {t('pendingList')}
        </h2>
        <button
          onClick={() => navigate('/approvals/pending')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t('viewAll')}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-4">
              <div className="h-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data && data.content.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <ClipboardCheck className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('emptyPending')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('emptyPendingDesc')}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && data && data.content.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 pb-2">
                제목
              </th>
              <th className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 pb-2">
                양식
              </th>
              <th className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 pb-2">
                기안자
              </th>
              <th className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 pb-2">
                제출일
              </th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((item) => (
              <tr
                key={item.documentId}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/documents/${item.documentId}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/documents/${item.documentId}`);
                }}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              >
                <td className="py-2 text-sm text-gray-900 dark:text-gray-50 max-w-[200px] truncate">
                  {item.title}
                </td>
                <td className="py-2">
                  <TemplateBadge templateCode={item.templateCode} />
                </td>
                <td className="py-2 text-sm text-gray-600 dark:text-gray-400">
                  {item.drafterName}
                </td>
                <td className="py-2 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
