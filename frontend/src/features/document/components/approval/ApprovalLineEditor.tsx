import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GripVertical, X } from 'lucide-react';
import { useAuthStore } from '../../../../stores/authStore';
import type { ApprovalLineRequest, ApprovalLineType } from '../../types/document';
import ApproverOrgTree from './ApproverOrgTree';
import type { OrgUser } from './ApproverOrgTree';

interface ApprovalLineEditorProps {
  approvalLines: ApprovalLineRequest[];
  onChange: (lines: ApprovalLineRequest[]) => void;
  disabled?: boolean;
}

const LINE_TYPE_BUTTONS: { type: ApprovalLineType; label: string }[] = [
  { type: 'APPROVE', label: '결재' },
  { type: 'AGREE', label: '합의' },
  { type: 'REFERENCE', label: '참조' },
];

interface DisplayInfo {
  name: string;
  dept: string;
  pos: string;
}

function recalcStepOrders(lines: ApprovalLineRequest[]): ApprovalLineRequest[] {
  let step = 0;
  return lines.map((l) => {
    if (l.lineType === 'REFERENCE') return { ...l, stepOrder: 0 };
    step++;
    return { ...l, stepOrder: step };
  });
}

export default function ApprovalLineEditor({
  approvalLines,
  onChange,
  disabled = false,
}: ApprovalLineEditorProps) {
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? 0;

  const [displayMap, setDisplayMap] = useState<Map<number, DisplayInfo>>(new Map());

  const excludeUserIds = [currentUserId, ...approvalLines.map((l) => l.approverId)];

  function handleSelectUser(orgUser: OrgUser, lineType: ApprovalLineType) {
    if (approvalLines.some((l) => l.approverId === orgUser.id)) return;
    if (orgUser.id === currentUserId) return;

    const sameTypeLines = approvalLines.filter((l) => l.lineType === lineType);
    const maxStep = sameTypeLines.length > 0
      ? Math.max(...sameTypeLines.map((l) => l.stepOrder))
      : 0;

    const newLine: ApprovalLineRequest = {
      approverId: orgUser.id,
      lineType,
      stepOrder: lineType === 'REFERENCE' ? 0 : maxStep + 1,
    };

    setDisplayMap((prev) => {
      const next = new Map(prev);
      next.set(orgUser.id, { name: orgUser.name, dept: orgUser.departmentName, pos: orgUser.positionName ?? '' });
      return next;
    });

    onChange([...approvalLines, newLine]);
  }

  function handleRemove(approverId: number) {
    const updated = approvalLines.filter((l) => l.approverId !== approverId);
    onChange(recalcStepOrders(updated));
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    const approveAgree = approvalLines.filter((l) => l.lineType !== 'REFERENCE');
    const references = approvalLines.filter((l) => l.lineType === 'REFERENCE');

    const reordered = [...approveAgree];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    onChange(recalcStepOrders([...reordered, ...references]));
  }

  const approveAgreeLines = approvalLines.filter((l) => l.lineType !== 'REFERENCE');
  const referenceLines = approvalLines.filter((l) => l.lineType === 'REFERENCE');

  if (disabled) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">결재선 설정</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          조직도에서 결재자를 선택하고 드래그로 순서를 변경하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
        {/* Left: Org Tree */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            조직도에서 결재자 선택
          </div>
          <ApproverOrgTree
            onSelectUser={(u) => handleSelectUser(u, 'APPROVE')}
            excludeUserIds={excludeUserIds}
          />
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-400 mb-1">결재 유형별 추가:</p>
            <p className="text-xs text-gray-500">클릭 시 결재자로 추가, 오른쪽에서 유형 변경 가능</p>
          </div>
        </div>

        {/* Right: Selected lines with DnD */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            선택된 결재선 ({approvalLines.length}명)
          </div>

          {approvalLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <p className="text-sm">결재자를 선택해주세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Approve/Agree — draggable */}
              {approveAgreeLines.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    결재순서 (드래그로 변경)
                  </div>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="approval-lines">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                          {approveAgreeLines.map((line, index) => {
                            const info = displayMap.get(line.approverId);
                            return (
                              <Draggable key={line.approverId} draggableId={String(line.approverId)} index={index}>
                                {(dragProvided, snapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border rounded-lg transition-shadow ${
                                      snapshot.isDragging
                                        ? 'border-blue-400 shadow-lg'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    {/* Drag handle */}
                                    <div
                                      {...dragProvided.dragHandleProps}
                                      className="cursor-grab text-gray-400 hover:text-gray-600 shrink-0"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </div>

                                    {/* Step number */}
                                    <span className="text-xs font-medium text-gray-400 w-5 text-center shrink-0">
                                      {index + 1}
                                    </span>

                                    {/* User info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {info?.name ?? `사용자 #${line.approverId}`}
                                      </div>
                                      {info && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {info.dept}{info.pos && ` / ${info.pos}`}
                                        </div>
                                      )}
                                    </div>

                                    {/* Type selector */}
                                    <select
                                      value={line.lineType}
                                      onChange={(e) => {
                                        const newType = e.target.value as ApprovalLineType;
                                        const updated = approvalLines.map((l) =>
                                          l.approverId === line.approverId
                                            ? { ...l, lineType: newType, stepOrder: newType === 'REFERENCE' ? 0 : l.stepOrder }
                                            : l,
                                        );
                                        onChange(recalcStepOrders(updated));
                                      }}
                                      className="text-xs h-7 px-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                      {LINE_TYPE_BUTTONS.map((btn) => (
                                        <option key={btn.type} value={btn.type}>{btn.label}</option>
                                      ))}
                                    </select>

                                    {/* Remove */}
                                    <button
                                      type="button"
                                      onClick={() => handleRemove(line.approverId)}
                                      className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}

              {/* Reference lines — not draggable */}
              {referenceLines.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">참조</div>
                  <div className="space-y-1.5">
                    {referenceLines.map((line) => {
                      const info = displayMap.get(line.approverId);
                      return (
                        <div
                          key={line.approverId}
                          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {info?.name ?? `사용자 #${line.approverId}`}
                            </div>
                            {info && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {info.dept}{info.pos && ` / ${info.pos}`}
                              </div>
                            )}
                          </div>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            참조
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(line.approverId)}
                            className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
