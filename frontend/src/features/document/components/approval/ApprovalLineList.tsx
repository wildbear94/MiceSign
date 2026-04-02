import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { ApprovalLineItem as ApprovalLineItemType, ApprovalLineType } from '../../../approval/types/approval';
import ApprovalLineItem from './ApprovalLineItem';

interface ApprovalLineListProps {
  items: ApprovalLineItemType[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onTypeChange: (userId: number, lineType: ApprovalLineType) => void;
  onRemove: (userId: number) => void;
}

export default function ApprovalLineList({
  items,
  onReorder,
  onTypeChange,
  onRemove,
}: ApprovalLineListProps) {
  const approveAgreeItems = items.filter((i) => i.lineType !== 'REFERENCE');
  const referenceItems = items.filter((i) => i.lineType === 'REFERENCE');

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <div className="p-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">결재선</h4>

      {items.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-8">
          좌측 조직도에서 결재자를 추가해주세요.
        </div>
      ) : (
        <div className="space-y-3">
          {/* APPROVE/AGREE items - draggable */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="approval-line">
              {(droppableProvided) => (
                <div
                  ref={droppableProvided.innerRef}
                  {...droppableProvided.droppableProps}
                  className="space-y-1"
                >
                  {approveAgreeItems.map((item, index) => (
                    <Draggable
                      key={item.userId}
                      draggableId={String(item.userId)}
                      index={index}
                    >
                      {(provided) => (
                        <ApprovalLineItem
                          item={item}
                          index={index}
                          isReference={false}
                          onTypeChange={(lineType) => onTypeChange(item.userId, lineType)}
                          onRemove={() => onRemove(item.userId)}
                          provided={provided}
                        />
                      )}
                    </Draggable>
                  ))}
                  {droppableProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Separator between APPROVE/AGREE and REFERENCE */}
          {referenceItems.length > 0 && (
            <div className="relative">
              <div className="border-t border-dashed border-gray-300 dark:border-gray-600" />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 px-2 text-xs text-gray-400">
                참조
              </span>
            </div>
          )}

          {/* REFERENCE items - not draggable */}
          {referenceItems.length > 0 && (
            <div className="space-y-1">
              {referenceItems.map((item) => (
                <div
                  key={item.userId}
                  className="flex items-center gap-2 h-11 min-h-[44px] px-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg"
                >
                  {/* No drag handle or step number for REFERENCE */}
                  <span className="w-4 flex-shrink-0" />

                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                      {item.userName}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-shrink-0">
                      ({item.departmentName}{item.positionName ? ` / ${item.positionName}` : ''})
                    </span>
                  </div>

                  <select
                    value={item.lineType}
                    onChange={(e) => onTypeChange(item.userId, e.target.value as ApprovalLineType)}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 w-[72px] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex-shrink-0"
                  >
                    <option value="APPROVE">승인</option>
                    <option value="AGREE">합의</option>
                    <option value="REFERENCE">참조</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => onRemove(item.userId)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
