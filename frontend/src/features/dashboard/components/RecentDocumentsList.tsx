import { useNavigate, Link } from 'react-router';
import { FileText } from 'lucide-react';
import { useRecentDocuments } from '../hooks/useDashboard';
import TemplateBadge from '../../document/components/TemplateBadge';
import DocumentStatusBadge from '../../document/components/DocumentStatusBadge';

export default function RecentDocumentsList() {
  const navigate = useNavigate();
  const { data, isLoading } = useRecentDocuments();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">내 최근 문서</h2>
        <Link
          to="/documents/my"
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
            <FileText className="h-8 w-8 mb-2" />
            <p className="text-sm">문서가 없습니다</p>
          </div>
        )}

        {!isLoading &&
          data?.content.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="w-full text-left px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <TemplateBadge templateCode={doc.templateCode} />
                    <DocumentStatusBadge status={doc.status} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-4 shrink-0">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
