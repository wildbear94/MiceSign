import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FieldCard from './FieldCard';
import type { FieldDefinition } from '../../types/builder';

interface BuilderCanvasProps {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  onSelect: (fieldId: string | null) => void;
  onDuplicate: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
}

export default function BuilderCanvas({
  fields,
  selectedFieldId,
  onSelect,
  onDuplicate,
  onDelete,
}: BuilderCanvasProps) {
  const { t } = useTranslation('admin');

  return (
    <Droppable droppableId="canvas">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          onClick={() => onSelect(null)}
          className={`p-4 min-h-full ${
            snapshot.isDraggingOver && fields.length > 0
              ? 'bg-blue-50/30 dark:bg-blue-950/20'
              : ''
          }`}
        >
          {fields.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl ${
                snapshot.isDraggingOver
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <Plus className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-base font-semibold text-gray-400 dark:text-gray-500">
                {t('templates.emptyCanvas')}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {t('templates.emptyCanvasDesc')}
              </p>
            </div>
          ) : (
            fields.map((field, index) => (
              <FieldCard
                key={field.id}
                field={field}
                index={index}
                isSelected={selectedFieldId === field.id}
                onSelect={onSelect}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
