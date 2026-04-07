import { useState } from 'react';
import { useAuthStore } from '../../../../stores/authStore';
import type { ApprovalLineRequest, ApprovalLineType } from '../../types/document';
import ApproverOrgTree from './ApproverOrgTree';
import type { OrgUser } from './ApproverOrgTree';

interface ApprovalLineEditorProps {
  approvalLines: ApprovalLineRequest[];
  onChange: (lines: ApprovalLineRequest[]) => void;
  disabled?: boolean;
}

const LINE_TYPE_BUTTONS: { type: ApprovalLineType; label: string; color: string }[] = [
  {
    type: 'APPROVE',
    label: '결재',
    color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    type: 'AGREE',
    label: '합의',
    color: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    type: 'REFERENCE',
    label: '참조',
    color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
  },
];

// Extended type for display purposes (keeps user info alongside request data)
interface ApprovalLineDisplayItem extends ApprovalLineRequest {
  approverName: string;
  departmentName: string;
  positionName: string;
}

export default function ApprovalLineEditor({
  approvalLines,
  onChange,
  disabled = false,
}: ApprovalLineEditorProps) {
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? 0;

  // We store display items in a local ref-like approach using data attributes
  // But since ApprovalLineRequest doesn't have name info, we need to track it
  // We'll use a Map stored via useState
  const [displayMap, setDisplayMap] = useState<Map<number, { name: string; dept: string; pos: string }>>(
    new Map(),
  );

  const excludeUserIds = [
    currentUserId,
    ...approvalLines.map((l) => l.approverId),
  ];

  function handleSelectUser(user: OrgUser, lineType: ApprovalLineType) {
    // Prevent duplicates
    if (approvalLines.some((l) => l.approverId === user.id)) return;
    // Prevent self
    if (user.id === currentUserId) return;

    // Calculate step order
    const sameTypeLines = approvalLines.filter((l) => l.lineType === lineType);
    const maxStep = sameTypeLines.length > 0
      ? Math.max(...sameTypeLines.map((l) => l.stepOrder))
      : 0;

    const newLine: ApprovalLineRequest = {
      approverId: user.id,
      lineType,
      stepOrder: lineType === 'REFERENCE' ? 0 : maxStep + 1,
    };

    // Store display info
    setDisplayMap((prev) => {
      const next = new Map(prev);
      next.set(user.id, {
        name: user.name,
        dept: user.departmentName,
        pos: user.positionName ?? '',
      });
      return next;
    });

    onChange([...approvalLines, newLine]);
  }

  function handleRemove(approverId: number) {
    const updated = approvalLines.filter((l) => l.approverId !== approverId);
    // Recalculate step orders
    let approveStep = 0;
    let agreeStep = 0;
    const recalculated = updated.map((l) => {
      if (l.lineType === 'APPROVE') {
        approveStep++;
        return { ...l, stepOrder: approveStep };
      }
      if (l.lineType === 'AGREE') {
        agreeStep++;
        return { ...l, stepOrder: agreeStep };
      }
      return { ...l, stepOrder: 0 };
    });
    onChange(recalculated);
  }

  function handleMoveUp(index: number) {
    const updated = [...approvalLines];
    if (index === 0) return;
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Recalculate step orders
    let step = 0;
    const recalculated = updated.map((l) => {
      if (l.lineType !== 'REFERENCE') {
        step++;
        return { ...l, stepOrder: step };
      }
      return l;
    });
    onChange(recalculated);
  }

  function handleMoveDown(index: number) {
    const updated = [...approvalLines];
    if (index === updated.length - 1) return;
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    let step = 0;
    const recalculated = updated.map((l) => {
      if (l.lineType !== 'REFERENCE') {
        step++;
        return { ...l, stepOrder: step };
      }
      return l;
    });
    onChange(recalculated);
  }

  // Split lines by type for display
  const approveAgreeLines = approvalLines.filter((l) => l.lineType !== 'REFERENCE');
  const referenceLines = approvalLines.filter((l) => l.lineType === 'REFERENCE');

  if (disabled) {
    return null;
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          결재선 설정
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          조직도에서 결재자를 선택하고 유형을 지정하세요.
        </p>
      </div>

      {/* Content: Org Tree (left) + Line List (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
        {/* Left: Organization tree */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            조직도에서 결재자 선택
          </div>
          <ApproverOrgTree
            onSelectUser={(user) => {
              // Show a small type selector or default to APPROVE
              handleSelectUser(user, 'APPROVE');
            }}
            excludeUserIds={excludeUserIds}
          />

          {/* Type selection hint */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-400 mb-2">결재 유형별 추가:</p>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>조직도에서 사용자 클릭 시 결재자로 추가됩니다.</p>
              <p>추가 후 오른쪽에서 유형을 변경할 수 있습니다.</p>
            </div>
          </div>
        </div>

        {/* Right: Selected approval lines */}
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
              {/* Approve/Agree lines */}
              {approveAgreeLines.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    결재순서
                  </div>
                  {approveAgreeLines.map((line, index) => {
                    const info = displayMap.get(line.approverId);
                    const globalIndex = approvalLines.indexOf(line);

                    return (
                      <div
                        key={line.approverId}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <span className="text-xs font-medium text-gray-400 w-5 text-center shrink-0">
                          {index + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {info?.name ?? `사용자 #${line.approverId}`}
                          </div>
                          {info && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {info.dept}
                              {info.pos && ` / ${info.pos}`}
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
                            onChange(updated);
                          }}
                          className="text-xs h-7 px-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {LINE_TYPE_BUTTONS.map((btn) => (
                            <option key={btn.type} value={btn.type}>
                              {btn.label}
                            </option>
                          ))}
                        </select>

                        {/* Move up/down */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveUp(globalIndex)}
                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={index === approveAgreeLines.length - 1}
                            onClick={() => handleMoveDown(globalIndex)}
                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemove(line.approverId)}
                          className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reference lines */}
              {referenceLines.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    참조
                  </div>
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
                              {info.dept}
                              {info.pos && ` / ${info.pos}`}
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
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
