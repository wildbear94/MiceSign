import { GripVertical, X } from 'lucide-react';
import type { DraggableProvided } from '@hello-pangea/dnd';
import type { ApprovalLineItem as ApprovalLineItemType, ApprovalLineType } from '../../../approval/types/approval';

interface ApprovalLineItemProps {
  item: ApprovalLineItemType;
  index: number;
  isReference: boolean;
  onTypeChange: (lineType: ApprovalLineType) => void;
  onRemove: () => void;
  provided: DraggableProvided;
}

const TYPE_OPTIONS: { value: ApprovalLineType; label: string }[] = [
  { value: 'APPROVE', label: '승인' },
  { value: 'AGREE', label: '합의' },
  { value: 'REFERENCE', label: '참조' },
];

export default function ApprovalLineItem({
  item,
  index,
  isReference,
  onTypeChange,
  onRemove,
  provided,
}: ApprovalLineItemProps) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className="flex items-center gap-2 h-11 min-h-[44px] px-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg"
    >
      {/* Drag handle - hidden for REFERENCE items */}
      <span
        {...provided.dragHandleProps}
        className={`flex-shrink-0 ${isReference ? 'invisible' : 'text-gray-400 cursor-grab'}`}
      >
        <GripVertical className="w-4 h-4" />
      </span>

      {/* Step number - only for APPROVE/AGREE */}
      {!isReference && (
        <span className="text-sm font-medium text-gray-500 flex-shrink-0 w-5 text-center">
          {index + 1}.
        </span>
      )}

      {/* Name + Dept/Position */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
          {item.userName}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-shrink-0">
          ({item.departmentName}{item.positionName ? ` / ${item.positionName}` : ''})
        </span>
      </div>

      {/* Type dropdown */}
      <select
        value={item.lineType}
        onChange={(e) => onTypeChange(e.target.value as ApprovalLineType)}
        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 w-[72px] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex-shrink-0"
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
        aria-label="삭제"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
