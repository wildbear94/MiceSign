import { Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  ChevronDown,
  Table2,
  FileText,
  EyeOff,
  Rows3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PALETTE_ITEMS } from '../../types/builder';
import type { FieldType } from '../../types/builder';

const iconMap: Record<string, LucideIcon> = {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  ChevronDown,
  Table2,
  Table: Table2,
  FileText,
  EyeOff,
  Rows3,
};

interface FieldPaletteProps {
  onClickAdd: (fieldType: FieldType) => void;
}

export default function FieldPalette({ onClickAdd }: FieldPaletteProps) {
  const { t } = useTranslation('admin');

  return (
    <div className="p-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {t('templates.fieldTypes', '필드 타입')}
      </p>
      <Droppable droppableId="palette" isDropDisabled={true}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {PALETTE_ITEMS.map((item, i) => {
              const Icon = iconMap[item.icon] ?? FileText;
              return (
                <Draggable
                  key={item.type}
                  draggableId={`palette-${item.type}`}
                  index={i}
                >
                  {(provided, snapshot) => (
                    <>
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        onClick={() => onClickAdd(item.type)}
                        className={`flex items-center gap-2 p-2 mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg cursor-grab hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-sm ${
                          snapshot.isDragging ? 'opacity-50' : ''
                        }`}
                      >
                        <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {t(`templates.fieldType_${item.labelKey}`, item.labelKey)}
                        </span>
                      </div>
                      {snapshot.isDragging && (
                        <div className="flex items-center gap-2 p-2 mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm opacity-50">
                          <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {t(`templates.fieldType_${item.labelKey}`, item.labelKey)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
