import { useTranslation } from 'react-i18next';
import DocumentStatusBadge from './DocumentStatusBadge';
import TemplateBadge from './TemplateBadge';
import type { DocumentResponse } from '../types/document';

interface DocumentListTableProps {
  documents: DocumentResponse[];
  onRowClick: (id: number) => void;
}

export default function DocumentListTable({
  documents,
  onRowClick,
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
              {t('columns.docNumber')}
            </th>
            <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 w-32">
              {t('columns.template')}
            </th>
            <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-3 w-28">
              {t('columns.status')}
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
                colSpan={5}
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
                <td className="px-4 py-3 font-medium">{doc.title || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {doc.docNumber || '-'}
                </td>
                <td className="px-4 py-3">
                  <TemplateBadge templateCode={doc.templateCode} />
                </td>
                <td className="px-4 py-3">
                  <DocumentStatusBadge status={doc.status} />
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
