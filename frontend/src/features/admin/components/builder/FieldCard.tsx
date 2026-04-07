import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  List,
  Table,
  FileText,
  EyeOff,
  Minus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import type { FieldDefinition } from '../../../document/types/dynamicForm';
import type { ReactNode } from 'react';

interface FieldCardProps {
  field: FieldDefinition;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

const FIELD_ICONS: Record<string, ReactNode> = {
  text: <Type className="w-4 h-4" />,
  textarea: <AlignLeft className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  select: <List className="w-4 h-4" />,
  table: <Table className="w-4 h-4" />,
  staticText: <FileText className="w-4 h-4" />,
  hidden: <EyeOff className="w-4 h-4" />,
  section: <Minus className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  text: '텍스트',
  textarea: '장문',
  number: '숫자',
  date: '날짜',
  select: '선택',
  table: '테이블',
  staticText: '안내',
  hidden: '숨김',
  section: '섹션',
};

const WIDTH_LABELS: Record<string, string> = {
  full: '전체',
  half: '1/2',
  third: '1/3',
};

export default function FieldCard({
  field,
  index: _index,
  isSelected,
  onSelect,
  onDelete,
  isDragging = false,
}: FieldCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-3 px-3 py-3 rounded-lg bg-white dark:bg-gray-900 border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 shadow-sm'
          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      } ${isDragging ? 'shadow-lg opacity-90' : ''}`}
    >
      {/* Drag handle */}
      <div className="flex-shrink-0 text-gray-400 cursor-grab">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Icon */}
      <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
        {FIELD_ICONS[field.type]}
      </div>

      {/* Label & required */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
            {field.label}
          </span>
          {field.required && (
            <span className="text-red-500 text-xs font-bold">*</span>
          )}
        </div>
      </div>

      {/* Width indicator */}
      {field.width && field.width !== 'full' && (
        <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
          {WIDTH_LABELS[field.width] ?? field.width}
        </span>
      )}

      {/* Type badge */}
      <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        {TYPE_LABELS[field.type] ?? field.type}
      </span>

      {/* Delete button */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
          title="삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Section children indicator */}
      {field.type === 'section' && field.children && field.children.length > 0 && (
        <span className="flex-shrink-0 text-[10px] text-gray-400">
          {field.children.length}개 하위 필드
        </span>
      )}
    </div>
  );
}
