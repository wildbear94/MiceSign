import { useTranslation } from 'react-i18next';
import type { DocumentStatus } from '../types/document';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}

const STATUS_CLASSES: Record<DocumentStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  WITHDRAWN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const { t } = useTranslation('document');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
