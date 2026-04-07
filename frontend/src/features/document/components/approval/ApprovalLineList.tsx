import { GripVertical, X, ChevronUp, ChevronDown, Users } from 'lucide-react';
import type { ApprovalLineRequest, ApprovalLineType } from '../../types/document';

interface ApprovalLineDisplay extends ApprovalLineRequest {
  approverName: string;
  departmentName: string;
  positionName: string;
}

interface ApprovalLineListProps {
  lines: ApprovalLineDisplay[];
  lineType: ApprovalLineType;
  onRemove?: (approverId: number) => void;
  onReorder?: (lines: ApprovalLineDisplay[]) => void;
  editable?: boolean;
}

const TYPE_LABELS: Record<ApprovalLineType, string> = {
  APPROVE: '결재',
  AGREE: '합의',
  REFERENCE: '참조',
};

const TYPE_COLORS: Record<ApprovalLineType, string> = {
  APPROVE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AGREE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REFERENCE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function ApprovalLineList({
  lines,
  lineType,
  onRemove,
  onReorder,
  editable = false,
}: ApprovalLineListProps) {
  const isSequential = lineType !== 'REFERENCE';

  function moveUp(index: number) {
    if (!onReorder || index === 0) return;
    const updated = [...lines];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onReorder(updated);
  }

  function moveDown(index: number) {
    if (!onReorder || index === lines.length - 1) return;
    const updated = [...lines];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onReorder(updated);
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-400">
        <Users className="h-6 w-6 mb-1" />
        <p className="text-xs">{TYPE_LABELS[lineType]}자를 선택해주세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[lineType]}`}
        >
          {TYPE_LABELS[lineType]}
        </span>
        <span className="text-xs text-gray-400">{lines.length}명</span>
      </div>

      {lines.map((line, index) => (
        <div
          key={line.approverId}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          {/* Drag handle (visual only) */}
          {editable && isSequential && (
            <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0 cursor-grab" />
          )}

          {/* Step number (sequential only) */}
          {isSequential && (
            <span className="text-xs font-medium text-gray-400 w-5 text-center shrink-0">
              {index + 1}
            </span>
          )}

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {line.approverName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {line.departmentName}
              {line.positionName && ` / ${line.positionName}`}
            </div>
          </div>

          {/* Move up/down buttons (sequential, editable) */}
          {editable && isSequential && (
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveUp(index)}
                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="위로 이동"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={index === lines.length - 1}
                onClick={() => moveDown(index)}
                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="아래로 이동"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Remove button */}
          {editable && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(line.approverId)}
              className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 shrink-0"
              aria-label="삭제"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export type { ApprovalLineDisplay };
