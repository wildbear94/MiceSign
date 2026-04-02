import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ClipboardCheck } from 'lucide-react';
import { usePendingApprovals } from '../hooks/useApprovals';
import TemplateBadge from '../../document/components/TemplateBadge';
import Pagination from '../../admin/components/Pagination';

export default function PendingApprovalsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading } = usePendingApprovals(page, 20);

  const handleRowClick = useCallback(
    (documentId: number) => {
      navigate(`/documents/${documentId}`);
    },
    [navigate],
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          결재 대기
        </h1>
      </div>

      {/* Loading skeleton */}
      {isLoading && !data && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            대기 중인 결재가 없습니다
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            결재 요청이 들어오면 여기에 표시됩니다.
          </p>
        </div>
      )}

      {/* Table */}
      {data && data.content.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    문서번호
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    양식
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    기안자
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    제출일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.content.map((item) => (
                  <tr
                    key={item.documentId}
                    onClick={() => handleRowClick(item.documentId)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-50 max-w-[300px] truncate block">
                        {item.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {item.docNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TemplateBadge templateCode={item.templateCode} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.drafterName} ({item.drafterDepartmentName})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {item.submittedAt?.slice(0, 10)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={data.number}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
