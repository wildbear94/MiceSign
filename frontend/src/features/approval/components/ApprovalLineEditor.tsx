import { useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { GripVertical, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OrgTreePickerModal from './OrgTreePickerModal';
import ApprovalLineStepBadge from './ApprovalLineStepBadge';
import type {
  ApprovalLineItem,
  ApprovalLineType,
  ApprovalLineRequest,
  ApprovalLineResponse,
} from '../types/approval';

interface ApprovalLineEditorProps {
  items: ApprovalLineItem[];
  onChange: (items: ApprovalLineItem[]) => void;
  drafterId: number;
  readOnly?: boolean;
  error?: string | null;
}

/**
 * Convert editor items to API request format.
 * Sequential items (APPROVE/AGREE) get 1-indexed stepOrder.
 * REFERENCE items get stepOrder 0.
 */
export function toApprovalLineRequests(
  items: ApprovalLineItem[],
): ApprovalLineRequest[] {
  let step = 1;
  return items.map((item) => ({
    approverId: item.userId,
    lineType: item.lineType,
    stepOrder: item.lineType === 'REFERENCE' ? 0 : step++,
  }));
}

/**
 * Convert API response back to editor items for initialization.
 */
export function toApprovalLineItems(
  responses: ApprovalLineResponse[],
): ApprovalLineItem[] {
  return responses.map((r) => ({
    userId: r.approver.id,
    userName: r.approver.name,
    departmentName: r.approver.departmentName,
    positionName: r.approver.positionName,
    lineType: r.lineType,
  }));
}

const MAX_APPROVERS = 10;

export default function ApprovalLineEditor({
  items,
  onChange,
  drafterId,
  readOnly = false,
  error,
}: ApprovalLineEditorProps) {
  const { t } = useTranslation('approval');
  const [pickerOpen, setPickerOpen] = useState(false);

  const sequentialItems = items.filter((i) => i.lineType !== 'REFERENCE');
  const referenceItems = items.filter((i) => i.lineType === 'REFERENCE');

  const currentLineUserIds = items.map((i) => i.userId);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const reordered = Array.from(sequentialItems);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onChange([...reordered, ...referenceItems]);
  };

  const handleAdd = (item: ApprovalLineItem) => {
    if (item.lineType === 'REFERENCE') {
      onChange([...sequentialItems, ...referenceItems, item]);
    } else {
      onChange([...sequentialItems, item, ...referenceItems]);
    }
  };

  const handleRemove = (userId: number) => {
    onChange(items.filter((i) => i.userId !== userId));
  };

  const handleTypeChange = (userId: number, newType: ApprovalLineType) => {
    const item = items.find((i) => i.userId === userId);
    if (!item) return;

    const updatedItem = { ...item, lineType: newType };
    const remaining = items.filter((i) => i.userId !== userId);

    const remainingSequential = remaining.filter(
      (i) => i.lineType !== 'REFERENCE',
    );
    const remainingReference = remaining.filter(
      (i) => i.lineType === 'REFERENCE',
    );

    if (newType === 'REFERENCE') {
      // Move to reference section
      onChange([...remainingSequential, ...remainingReference, updatedItem]);
    } else {
      // Move to end of sequential section
      onChange([
        ...remainingSequential,
        updatedItem,
        ...remainingReference,
      ]);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('approvalLine.title')}
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={items.length >= MAX_APPROVERS}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg h-9 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            {t('approvalLine.addApprover')}
          </button>
        )}
      </div>

      {/* Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        {items.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">
            {t('approvalLine.emptyState')}
          </div>
        ) : (
          <>
            {/* Sequential section: APPROVE + AGREE */}
            {sequentialItems.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  {t('approvalLine.sequential')}
                </div>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="approval-line" type="APPROVAL">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {sequentialItems.map((item, index) => (
                          <Draggable
                            key={item.userId}
                            draggableId={String(item.userId)}
                            index={index}
                            isDragDisabled={readOnly}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`px-4 py-3 flex items-center gap-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700 ${
                                  snapshot.isDragging
                                    ? 'bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                                    : ''
                                }`}
                              >
                                {/* Drag handle */}
                                {!readOnly && (
                                  <span
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                  </span>
                                )}

                                {/* Step number */}
                                <span className="text-sm font-medium text-gray-500 w-6 text-center">
                                  {index + 1}
                                </span>

                                {/* Badge */}
                                <ApprovalLineStepBadge
                                  lineType={item.lineType}
                                />

                                {/* Approver info */}
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {item.userName}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                    {item.departmentName}
                                    {item.positionName &&
                                      ` / ${item.positionName}`}
                                  </span>
                                </div>

                                {/* Type selector */}
                                {!readOnly && (
                                  <select
                                    value={item.lineType}
                                    onChange={(e) =>
                                      handleTypeChange(
                                        item.userId,
                                        e.target.value as ApprovalLineType,
                                      )
                                    }
                                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                  >
                                    <option value="APPROVE">
                                      {t('typeShort.APPROVE')}
                                    </option>
                                    <option value="AGREE">
                                      {t('typeShort.AGREE')}
                                    </option>
                                    <option value="REFERENCE">
                                      {t('typeShort.REFERENCE')}
                                    </option>
                                  </select>
                                )}

                                {/* Remove button */}
                                {!readOnly && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemove(item.userId)}
                                    className="p-1 rounded text-gray-400 hover:text-red-500"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}

            {/* Reference section */}
            {referenceItems.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-t border-gray-100 dark:border-gray-700">
                  {t('approvalLine.reference')}
                </div>
                {referenceItems.map((item) => (
                  <div
                    key={item.userId}
                    className="px-4 py-3 flex items-center gap-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700"
                  >
                    {/* No drag handle for reference */}
                    {!readOnly && <span className="w-4" />}

                    {/* No step number */}
                    <span className="w-6" />

                    {/* Badge */}
                    <ApprovalLineStepBadge lineType={item.lineType} />

                    {/* Approver info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.userName}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {item.departmentName}
                        {item.positionName && ` / ${item.positionName}`}
                      </span>
                    </div>

                    {/* Type selector */}
                    {!readOnly && (
                      <select
                        value={item.lineType}
                        onChange={(e) =>
                          handleTypeChange(
                            item.userId,
                            e.target.value as ApprovalLineType,
                          )
                        }
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        <option value="APPROVE">
                          {t('typeShort.APPROVE')}
                        </option>
                        <option value="AGREE">
                          {t('typeShort.AGREE')}
                        </option>
                        <option value="REFERENCE">
                          {t('typeShort.REFERENCE')}
                        </option>
                      </select>
                    )}

                    {/* Remove button */}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemove(item.userId)}
                        className="p-1 rounded text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Max limit warning */}
      {items.length >= MAX_APPROVERS && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
          {t('approvalLine.maxWarning')}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}

      {/* Org Tree Picker Modal */}
      <OrgTreePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={handleAdd}
        currentLineUserIds={currentLineUserIds}
        drafterId={drafterId}
        currentCount={items.length}
        maxCount={MAX_APPROVERS}
      />
    </div>
  );
}
