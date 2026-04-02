import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PositionItem } from '../../../types/admin';

interface PositionTableProps {
  positions: PositionItem[];
  onEdit: (pos: PositionItem) => void;
  onDeactivate: (pos: PositionItem) => void;
  onReorder: (orderedIds: number[]) => void;
}

export default function PositionTable({
  positions,
  onEdit,
  onDeactivate,
  onReorder,
}: PositionTableProps) {
  const { t } = useTranslation('admin');

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const items = Array.from(positions);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    const orderedIds = items.map((p) => p.id);
    onReorder(orderedIds);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-400">
            <th className="w-10 px-2 py-3" />
            <th className="text-left px-4 py-3">{t('positions.positionName')}</th>
            <th className="text-left px-4 py-3 w-20">순서</th>
            <th className="text-left px-4 py-3 w-24">상태</th>
            <th className="text-right px-4 py-3 w-32">액션</th>
          </tr>
        </thead>
        <Droppable droppableId="positions" type="POSITION">
          {(provided) => (
            <tbody ref={provided.innerRef} {...provided.droppableProps}>
              {positions.map((position, index) => (
                <Draggable
                  key={position.id}
                  draggableId={String(position.id)}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <tr
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`text-sm text-gray-900 dark:text-gray-50 border-t border-gray-100 dark:border-gray-700 ${
                        snapshot.isDragging ? 'bg-blue-50 shadow-lg dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'
                      } ${!position.isActive ? 'opacity-50' : ''}`}
                    >
                      {/* Drag handle */}
                      <td className="px-2 py-3">
                        <span {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing inline-flex">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </span>
                      </td>

                      {/* Position name */}
                      <td className="px-4 py-3 font-medium">
                        {position.name}
                        {!position.isActive && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded ml-2">
                            {t('positions.inactive')}
                          </span>
                        )}
                      </td>

                      {/* Sort order */}
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {position.sortOrder}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {position.isActive ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            활성
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            비활성
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(position)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          >
                            {t('common.edit')}
                          </button>
                          {position.isActive && (
                            <button
                              type="button"
                              onClick={() => onDeactivate(position)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                            >
                              {t('common.deactivate')}
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </tbody>
          )}
        </Droppable>
      </table>
    </DragDropContext>
  );
}
