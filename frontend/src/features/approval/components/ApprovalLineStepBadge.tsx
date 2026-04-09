import { useTranslation } from 'react-i18next';
import type { ApprovalLineType } from '../types/approval';

interface ApprovalLineStepBadgeProps {
  lineType: ApprovalLineType;
}

const BADGE_STYLES: Record<ApprovalLineType, string> = {
  APPROVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AGREE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REFERENCE: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function ApprovalLineStepBadge({
  lineType,
}: ApprovalLineStepBadgeProps) {
  const { t } = useTranslation('approval');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BADGE_STYLES[lineType]}`}
    >
      {t(`typeShort.${lineType}`)}
    </span>
  );
}
