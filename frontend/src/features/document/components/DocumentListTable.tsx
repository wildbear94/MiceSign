import DocumentStatusBadge from './DocumentStatusBadge';
import TemplateBadge from './TemplateBadge';
import HighlightText from './HighlightText';
import type { DocumentListItem } from '../types/document';

interface DocumentListTableProps {
  documents: DocumentListItem[];
  keyword?: string;
  onRowClick: (doc: DocumentListItem) => void;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function DocumentListTable({
  documents,
  keyword,
  onRowClick,
}: DocumentListTableProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-sm">검색 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 w-36">
              문서번호
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 w-24">
              양식
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3">
              제목
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 w-40">
              기안자
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 w-24">
              상태
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 w-28">
              상신일
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 w-28">
              작성일
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {documents.map((doc) => (
            <tr
              key={doc.id}
              onClick={() => onRowClick(doc)}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                {doc.docNumber ? (
                  <HighlightText text={doc.docNumber} keyword={keyword} />
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                <TemplateBadge code={doc.templateCode} name={doc.templateName} />
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                <HighlightText text={doc.title || '(제목 없음)'} keyword={keyword} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                <div>{doc.drafterName}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {doc.departmentName} / {doc.positionName}
                </div>
              </td>
              <td className="px-4 py-3">
                <DocumentStatusBadge status={doc.status} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {formatDate(doc.submittedAt)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {formatDate(doc.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
