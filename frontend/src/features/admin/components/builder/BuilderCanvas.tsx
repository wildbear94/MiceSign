import type { Dispatch } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Layout } from 'lucide-react';
import type { FieldDefinition } from '../../../document/types/dynamicForm';
import type { BuilderAction } from './useBuilderReducer';
import FieldCard from './FieldCard';
import BuilderPreview from './BuilderPreview';

interface BuilderCanvasProps {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  dispatch: Dispatch<BuilderAction>;
  isPreview: boolean;
}

export default function BuilderCanvas({
  fields,
  selectedFieldId,
  dispatch,
  isPreview,
}: BuilderCanvasProps) {
  if (isPreview) {
    return <BuilderPreview fields={fields} />;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Droppable droppableId="canvas" type="FIELD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[400px] rounded-lg transition-colors ${
              snapshot.isDraggingOver
                ? 'bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-dashed ring-blue-300 dark:ring-blue-700'
                : ''
            }`}
          >
            {fields.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                <Layout className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">
                  필드를 끌어다 놓으세요
                </p>
                <p className="text-xs mt-1">
                  왼쪽 패널에서 필드를 끌어다 놓거나 클릭하세요
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {fields.map((field, index) => (
                <Draggable
                  key={field.id}
                  draggableId={field.id}
                  index={index}
                >
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                    >
                      <FieldCard
                        field={field}
                        index={index}
                        isSelected={selectedFieldId === field.id}
                        onSelect={() =>
                          dispatch({ type: 'SELECT_FIELD', fieldId: field.id })
                        }
                        onDelete={() =>
                          dispatch({ type: 'REMOVE_FIELD', fieldId: field.id })
                        }
                        isDragging={dragSnapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
            </div>

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
