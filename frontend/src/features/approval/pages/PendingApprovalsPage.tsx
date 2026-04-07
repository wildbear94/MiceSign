import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ClipboardCheck } from 'lucide-react';
import { usePendingApprovals } from '../hooks/useApprovals';
import TemplateBadge from '../../document/components/TemplateBadge';
import Pagination from '../../admin/components/Pagination';
import type { ApprovalLineType } from '../../document/types/document';

const LINE_TYPE_LABELS: Record<ApprovalLineType, string> = {
  APPROVE: '결재',
  AGREE: '합의',
  REFERENCE: '참조',
};

const LINE_TYPE_COLORS: Record<ApprovalLineType, string> = {
  APPROVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AGREE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REFERENCE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function PendingApprovalsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = usePendingApprovals(page);

  const handlePageChange = useCallback((p: number) => setPage(p), []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          결재 대기
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          나에게 결재 요청이 온 문서 목록입니다.
        </p>
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
          결재 대기 목록을 불러오는데 실패했습니다.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data && data.content.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <ClipboardCheck className="h-12 w-12 mb-3" />
          <p className="text-base font-medium">대기 중인 결재가 없습니다</p>
          <p className="text-sm mt-1">새로운 결재 요청이 오면 여기에 표시됩니다.</p>
        </div>
      )}

      {/* Table */}
      {data && data.content.length > 0 && (
        <>
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    문서번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    양식
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    기안자 (부서)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    결재 유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    상신일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.content.map((item) => (
                  <tr
                    key={item.approvalLineId}
                    onClick={() => navigate(`/documents/${item.documentId}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                      {item.docNumber ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TemplateBadge code={item.templateCode} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      <span>{item.drafterName}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        ({item.departmentName})
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          LINE_TYPE_COLORS[item.lineType] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {LINE_TYPE_LABELS[item.lineType] ?? item.lineType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(item.createdAt)}
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
