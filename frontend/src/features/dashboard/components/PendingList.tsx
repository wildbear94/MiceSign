import { useNavigate, Link } from 'react-router';
import { Clock } from 'lucide-react';
import { usePendingPreview } from '../hooks/useDashboard';

export default function PendingList() {
  const navigate = useNavigate();
  const { data, isLoading } = usePendingPreview();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">결재 대기</h2>
        <Link
          to="/approvals/pending"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          전체보기
        </Link>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {isLoading && (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (!data || data.content.length === 0) && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
            <Clock className="h-8 w-8 mb-2" />
            <p className="text-sm">대기 중인 결재가 없습니다</p>
          </div>
        )}

        {!isLoading &&
          data?.content.map((item) => (
            <button
              key={item.documentId}
              type="button"
              onClick={() => navigate(`/documents/${item.documentId}`)}
              className="w-full text-left px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.docNumber} &middot; {item.drafterName}
                  </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-4 shrink-0">
                  {new Date(item.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
