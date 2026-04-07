import { useTranslation } from 'react-i18next';
import DocumentStatusBadge from './DocumentStatusBadge';
import TemplateBadge from './TemplateBadge';
import HighlightText from './HighlightText';
import type { DocumentResponse } from '../types/document';

interface DocumentListTableProps {
  documents: DocumentResponse[];
  onRowClick: (id: number) => void;
  keyword?: string;
}

export default function DocumentListTable({
  documents,
  onRowClick,
  keyword,
}: DocumentListTableProps) {
  const { t } = useTranslation('document');

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">
              {t('columns.title')}
            </th>
            <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 w-40">
              {t('columns.docNumber', '문서번호')}
            </th>
            <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 w-32">
              {t('columns.template')}
            </th>
            <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 w-28">
              {t('columns.status')}
            </th>
            <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 w-28">
              {t('columns.drafter', '기안자')}
            </th>
            <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 w-32">
              {t('columns.createdAt')}
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="text-center py-12 text-sm text-gray-500 dark:text-gray-400"
              >
                {t('emptyState.title')}
              </td>
            </tr>
          ) : (
            documents.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => onRowClick(doc.id)}
                className="text-sm text-gray-900 dark:text-gray-50 border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium">
                  <HighlightText text={doc.title || '-'} keyword={keyword || ''} />
                </td>
                <td className="px-4 py-3 w-40">
                  {doc.docNumber ? (
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      <HighlightText text={doc.docNumber} keyword={keyword || ''} />
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-600">
                      {t('docNumber.draft', '-')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <TemplateBadge templateCode={doc.templateCode} />
                </td>
                <td className="px-4 py-3">
                  <DocumentStatusBadge status={doc.status} />
                </td>
                <td className="px-4 py-3 w-28">
                  <HighlightText text={doc.drafterName || ''} keyword={keyword || ''} />
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {formatDate(doc.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
