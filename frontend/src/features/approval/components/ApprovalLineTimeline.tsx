import { useTranslation } from 'react-i18next';
import type { ApprovalLineResponse } from '../types/approval';
import type { DocumentStatus } from '../../document/types/document';

interface ApprovalLineTimelineProps {
  approvalLines: ApprovalLineResponse[];
  currentStep: number | null;
  documentStatus: DocumentStatus;
}

function formatTimestamp(dateString: string | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export default function ApprovalLineTimeline({
  approvalLines,
  currentStep,
  documentStatus,
}: ApprovalLineTimelineProps) {
  const { t } = useTranslation('approval');

  const sequentialLines = approvalLines
    .filter((line) => line.lineType !== 'REFERENCE')
    .sort((a, b) => a.stepOrder - b.stepOrder);

  const referenceLines = approvalLines.filter(
    (line) => line.lineType === 'REFERENCE',
  );

  function getStepCircleClass(
    line: ApprovalLineResponse,
  ): string {
    const base = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium';
    if (line.status === 'APPROVED') {
      return `${base} bg-green-100 text-green-700`;
    }
    if (line.status === 'REJECTED') {
      return `${base} bg-red-100 text-red-700`;
    }
    if (
      line.status === 'PENDING' &&
      line.stepOrder === currentStep &&
      documentStatus === 'SUBMITTED'
    ) {
      return `${base} bg-blue-100 text-blue-700 ring-2 ring-blue-300`;
    }
    return `${base} bg-gray-100 text-gray-500`;
  }

  function getStatusBadge(line: ApprovalLineResponse) {
    const badgeBase = 'px-2 py-0.5 rounded-full text-xs font-medium';

    // Current approver indicator
    if (
      line.status === 'PENDING' &&
      line.stepOrder === currentStep &&
      documentStatus === 'SUBMITTED'
    ) {
      return (
        <span className={`${badgeBase} bg-blue-100 text-blue-700`}>
          {t('action.currentApprover')}
        </span>
      );
    }

    switch (line.status) {
      case 'APPROVED':
        return (
          <span className={`${badgeBase} bg-green-100 text-green-700`}>
            {t('status.APPROVED')}
          </span>
        );
      case 'REJECTED':
        return (
          <span className={`${badgeBase} bg-red-100 text-red-700`}>
            {t('status.REJECTED')}
          </span>
        );
      case 'PENDING':
        return (
          <span className={`${badgeBase} bg-gray-100 text-gray-700`}>
            {t('status.PENDING')}
          </span>
        );
      case 'SKIPPED':
        return (
          <span className={`${badgeBase} bg-gray-100 text-gray-500`}>
            {t('status.SKIPPED')}
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Section heading */}
      <h3 className="text-lg font-semibold px-6 py-4 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-50">
        {t('approvalLine.title')}
      </h3>

      {/* Sequential approval section */}
      {sequentialLines.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-6 pt-4 pb-2">
            {t('approvalLine.sequential')}
          </h4>
          <div className="px-6 pb-4">
            {sequentialLines.map((line, index) => (
              <div key={line.id} className="relative flex items-start gap-3 py-3">
                {/* Vertical connector line */}
                {index < sequentialLines.length - 1 && (
                  <div className="absolute left-[13px] top-14 bottom-0 w-px bg-gray-200 dark:bg-gray-600" />
                )}

                {/* Step number circle */}
                <div className="flex-shrink-0">
                  <div className={getStepCircleClass(line)}>
                    {line.stepOrder}
                  </div>
                </div>

                {/* Approver info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {line.approver.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {line.approver.departmentName}
                        {line.approver.positionName && ` / ${line.approver.positionName}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(line)}
                    </div>
                  </div>

                  {/* Line type label */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t(`typeShort.${line.lineType}`)} ({t(`type.${line.lineType}`)})
                  </div>

                  {/* Acted-at timestamp */}
                  {line.actedAt && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatTimestamp(line.actedAt)}
                    </div>
                  )}

                  {/* Comment */}
                  {line.comment && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                      &ldquo;{line.comment}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference section */}
      {referenceLines.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 mt-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-6 pt-4 pb-2">
            {t('approvalLine.reference')}
          </h4>
          <div className="px-6 pb-4">
            {referenceLines.map((line) => (
              <div key={line.id} className="flex items-start gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {line.approver.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {line.approver.departmentName}
                        {line.approver.positionName && ` / ${line.approver.positionName}`}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 flex-shrink-0">
                      {t('status.PENDING') === line.status ? t('status.PENDING') : t('typeShort.REFERENCE')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('typeShort.REFERENCE')} ({t('type.REFERENCE')})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
