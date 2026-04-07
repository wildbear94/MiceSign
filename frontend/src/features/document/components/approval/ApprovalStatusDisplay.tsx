import {
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  MinusCircle,
  Bookmark,
} from 'lucide-react';
import type { ApprovalLine } from '../../types/document';

interface ApprovalStatusDisplayProps {
  approvalLines: ApprovalLine[];
  currentStep: number | null;
}

const TYPE_LABELS: Record<string, string> = {
  APPROVE: '승인',
  AGREE: '합의',
  REFERENCE: '참조',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기중',
  APPROVED: '승인됨',
  REJECTED: '반려됨',
  SKIPPED: '건너뜀',
};

function getStatusIcon(status: string, stepOrder: number, currentStep: number | null) {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'REJECTED':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'SKIPPED':
      return <MinusCircle className="h-5 w-5 text-gray-400" />;
    case 'PENDING':
      if (currentStep !== null && stepOrder === currentStep) {
        return <Clock className="h-5 w-5 text-blue-500" />;
      }
      return <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />;
    default:
      return <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />;
  }
}

function getStatusColor(status: string, stepOrder: number, currentStep: number | null) {
  switch (status) {
    case 'APPROVED':
      return 'text-green-600 dark:text-green-400';
    case 'REJECTED':
      return 'text-red-600 dark:text-red-400';
    case 'SKIPPED':
      return 'text-gray-400';
    case 'PENDING':
      if (currentStep !== null && stepOrder === currentStep) {
        return 'text-blue-600 dark:text-blue-400';
      }
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

export default function ApprovalStatusDisplay({
  approvalLines,
  currentStep,
}: ApprovalStatusDisplayProps) {
  const sequentialLines = approvalLines
    .filter((line) => line.lineType === 'APPROVE' || line.lineType === 'AGREE')
    .sort((a, b) => a.stepOrder - b.stepOrder);

  const referenceLines = approvalLines.filter((line) => line.lineType === 'REFERENCE');

  if (approvalLines.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 py-4">
        결재선이 설정되지 않았습니다.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {/* Sequential lines (APPROVE / AGREE) */}
      {sequentialLines.map((line, index) => (
        <div key={line.id}>
          <div className="flex items-start gap-3 py-3">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              {getStatusIcon(line.status, line.stepOrder, currentStep)}
              {index < sequentialLines.length - 1 && (
                <div className="w-px h-full min-h-[24px] bg-gray-200 dark:bg-gray-700 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {line.approverName}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {TYPE_LABELS[line.lineType] ?? line.lineType}
                </span>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {line.departmentName}
                {line.positionName && ` / ${line.positionName}`}
              </div>

              <div
                className={`text-xs mt-1 font-medium ${getStatusColor(line.status, line.stepOrder, currentStep)}`}
              >
                {STATUS_LABELS[line.status] ?? line.status}
                {line.actedAt && (
                  <span className="ml-2 font-normal text-gray-400">
                    {new Date(line.actedAt).toLocaleString('ko-KR')}
                  </span>
                )}
              </div>

              {line.comment && (
                <p className="mt-1.5 text-xs italic text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1">
                  &ldquo;{line.comment}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Reference lines */}
      {referenceLines.length > 0 && (
        <>
          <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-3" />
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            참조
          </div>
          {referenceLines.map((line) => (
            <div key={line.id} className="flex items-start gap-3 py-2">
              <Bookmark className="h-5 w-5 text-purple-500 shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {line.approverName}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    참조
                  </span>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {line.departmentName}
                  {line.positionName && ` / ${line.positionName}`}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
