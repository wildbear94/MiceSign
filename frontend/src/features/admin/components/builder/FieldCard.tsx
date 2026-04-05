import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, Copy, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FieldDefinition } from '../../types/builder';

interface FieldCardProps {
  field: FieldDefinition;
  isSelected: boolean;
  index: number;
  onSelect: (fieldId: string) => void;
  onDuplicate: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
}

export default function FieldCard({
  field,
  isSelected,
  index,
  onSelect,
  onDuplicate,
  onDelete,
}: FieldCardProps) {
  const { t } = useTranslation('admin');

  return (
    <Draggable draggableId={field.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(field.id);
          }}
          className={`
            mb-2 p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3
            ${
              isSelected
                ? 'ring-2 ring-blue-600 shadow-md bg-white dark:bg-gray-900'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow'
            }
            ${
              snapshot.isDragging
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 shadow-lg opacity-90'
                : ''
            }
          `}
        >
          {/* Drag handle */}
          <span
            {...provided.dragHandleProps}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-grab"
          >
            <GripVertical className="h-4 w-4" />
          </span>

          {/* Content */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {field.label}
            </span>
            {field.required && (
              <span className="text-red-500 text-xs">*</span>
            )}
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded shrink-0">
              {field.type}
            </span>
            {field.config?.width === 'half' && (
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-2 py-0.5 rounded shrink-0">
                1/2
              </span>
            )}
          </div>

          {/* Toolbar (selected only) */}
          {isSelected && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(field.id);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                title={t('templates.duplicate')}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(field.id);
                }}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title={t('templates.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
