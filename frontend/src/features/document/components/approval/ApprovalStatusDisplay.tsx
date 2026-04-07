import {
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
  MinusCircle,
  Bookmark,
} from 'lucide-react';
import type { ApprovalLineResponse } from '../../../approval/types/approval';

interface ApprovalStatusDisplayProps {
  approvalLines: ApprovalLineResponse[];
  currentStep: number | null;
}

function formatTimestamp(dateString: string | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getTypeLabel(lineType: string): string {
  switch (lineType) {
    case 'APPROVE':
      return '승인';
    case 'AGREE':
      return '합의';
    case 'REFERENCE':
      return '참조';
    default:
      return lineType;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return '대기중';
    case 'APPROVED':
      return '승인됨';
    case 'REJECTED':
      return '반려됨';
    case 'SKIPPED':
      return '건너뜀';
    default:
      return status;
  }
}

function StatusIcon({
  status,
  stepOrder,
  currentStep,
}: {
  status: string;
  stepOrder: number;
  currentStep: number | null;
}) {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />;
    case 'REJECTED':
      return <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />;
    case 'SKIPPED':
      return <MinusCircle className="h-6 w-6 text-gray-400 flex-shrink-0" />;
    case 'PENDING':
      if (stepOrder === currentStep) {
        return <Clock className="h-6 w-6 text-blue-600 flex-shrink-0" />;
      }
      return <Circle className="h-6 w-6 text-gray-300 dark:text-gray-600 flex-shrink-0" />;
    default:
      return <Circle className="h-6 w-6 text-gray-300 dark:text-gray-600 flex-shrink-0" />;
  }
}

export default function ApprovalStatusDisplay({
  approvalLines,
  currentStep,
}: ApprovalStatusDisplayProps) {
  if (!approvalLines || approvalLines.length === 0) return null;

  // Split into sequential (APPROVE/AGREE with stepOrder > 0) and reference lines
  const sequentialLines = approvalLines
    .filter((l) => (l.lineType === 'APPROVE' || l.lineType === 'AGREE') && l.stepOrder > 0)
    .sort((a, b) => a.stepOrder - b.stepOrder);

  const referenceLines = approvalLines.filter((l) => l.lineType === 'REFERENCE');

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
        결재 현황
      </h3>

      {/* Sequential approval lines */}
      <div className="space-y-0">
        {sequentialLines.map((line, index) => {
          const isLast = index === sequentialLines.length - 1;
          return (
            <div key={line.id} className="relative">
              <div className="flex items-start gap-3 py-2">
                {/* Status icon */}
                <div className="relative z-10">
                  <StatusIcon
                    status={line.status}
                    stepOrder={line.stepOrder}
                    currentStep={currentStep}
                  />
                </div>

                {/* Approver info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {line.approver.name} ({line.approver.departmentName}
                      {line.approver.positionName ? ` / ${line.approver.positionName}` : ''})
                    </span>
                    <span className="text-xs text-gray-500">
                      {getTypeLabel(line.lineType)}
                    </span>
                    <span className="text-xs text-gray-500">
                      &mdash; {getStatusLabel(line.status)}
                    </span>
                  </div>

                  {/* Comment */}
                  {line.comment && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic ml-8 mt-1">
                      &ldquo;{line.comment}&rdquo;
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                {line.actedAt && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
                    {formatTimestamp(line.actedAt)}
                  </span>
                )}
              </div>

              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-3 top-10 bottom-0 border-l-2 border-gray-200 dark:border-gray-700" />
              )}
            </div>
          );
        })}
      </div>

      {/* Reference separator and lines */}
      {referenceLines.length > 0 && (
        <>
          <div className="relative my-4">
            <div className="border-t border-dashed border-gray-300 dark:border-gray-600" />
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs text-gray-400 bg-white dark:bg-gray-900 px-2">
              참조
            </span>
          </div>

          <div className="space-y-2">
            {referenceLines.map((line) => (
              <div key={line.id} className="flex items-center gap-3 py-2">
                <Bookmark className="h-6 w-6 text-purple-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {line.approver.name} ({line.approver.departmentName}
                  {line.approver.positionName ? ` / ${line.approver.positionName}` : ''})
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
