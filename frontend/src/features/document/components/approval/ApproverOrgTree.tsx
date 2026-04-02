import { useState, useCallback } from 'react';
import { ChevronRight, Plus, Loader2 } from 'lucide-react';
import { useDepartmentTree, useDepartmentMembers } from '../../../admin/hooks/useDepartments';
import type { DepartmentTreeNode } from '../../../../types/admin';
import type { ApprovalLineType } from '../../../approval/types/approval';

interface ApproverOrgTreeProps {
  onAddApprover: (
    user: { id: number; name: string; departmentName: string; positionName: string | null },
    lineType: ApprovalLineType,
  ) => void;
  disabledUserIds: number[];
  currentUserId: number;
}

const LINE_TYPE_OPTIONS: { value: ApprovalLineType; label: string; tooltip: string }[] = [
  { value: 'APPROVE', label: '승인', tooltip: '결재권자 — 문서를 승인 또는 반려합니다' },
  { value: 'AGREE', label: '합의', tooltip: '합의자 — 협조 부서의 동의를 구합니다' },
  { value: 'REFERENCE', label: '참조', tooltip: '참조자 — 열람만 가능합니다' },
];

function DeptNode({
  node,
  depth,
  expandedIds,
  onToggleExpand,
  onAddApprover,
  disabledUserIds,
  currentUserId,
}: {
  node: DepartmentTreeNode;
  depth: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onAddApprover: ApproverOrgTreeProps['onAddApprover'];
  disabledUserIds: number[];
  currentUserId: number;
}) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onToggleExpand(node.id)}
      >
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-150 ${
              isExpanded ? 'rotate-90' : ''
            } ${!hasChildren && node.memberCount === 0 ? 'invisible' : ''}`}
          />
        </span>
        <span className="text-sm truncate">{node.name}</span>
        <span className="text-xs text-gray-400 ml-1">({node.memberCount})</span>
      </div>

      {isExpanded && (
        <>
          {/* Members of this department */}
          <DeptMembers
            departmentId={node.id}
            departmentName={node.name}
            depth={depth}
            onAddApprover={onAddApprover}
            disabledUserIds={disabledUserIds}
            currentUserId={currentUserId}
          />

          {/* Child departments */}
          {hasChildren &&
            node.children.map((child) => (
              <DeptNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onAddApprover={onAddApprover}
                disabledUserIds={disabledUserIds}
                currentUserId={currentUserId}
              />
            ))}
        </>
      )}
    </div>
  );
}

function DeptMembers({
  departmentId,
  departmentName,
  depth,
  onAddApprover,
  disabledUserIds,
  currentUserId,
}: {
  departmentId: number;
  departmentName: string;
  depth: number;
  onAddApprover: ApproverOrgTreeProps['onAddApprover'];
  disabledUserIds: number[];
  currentUserId: number;
}) {
  const { data: members, isLoading } = useDepartmentMembers(departmentId);
  const [openDropdownUserId, setOpenDropdownUserId] = useState<number | null>(null);

  const handleTypeSelect = useCallback(
    (
      user: { id: number; name: string; positionName: string | null },
      lineType: ApprovalLineType,
    ) => {
      onAddApprover(
        { id: user.id, name: user.name, departmentName, positionName: user.positionName },
        lineType,
      );
      setOpenDropdownUserId(null);
    },
    [onAddApprover, departmentName],
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1 text-gray-400"
        style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">로딩중...</span>
      </div>
    );
  }

  if (!members || members.length === 0) return null;

  return (
    <>
      {members
        .filter((m) => m.status === 'ACTIVE')
        .map((member) => {
          const isDisabled = disabledUserIds.includes(member.id);
          const isSelf = member.id === currentUserId;
          const showDropdown = openDropdownUserId === member.id;

          return (
            <div
              key={member.id}
              className="flex items-center gap-2 px-2 py-1.5"
              style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
            >
              <span className="text-sm text-gray-900 dark:text-gray-50 truncate">
                {member.name}
              </span>
              {member.positionName && (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {member.positionName}
                </span>
              )}

              <div className="ml-auto relative flex-shrink-0">
                {showDropdown ? (
                  <div className="flex items-center gap-1">
                    {LINE_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.tooltip}
                        onClick={() =>
                          handleTypeSelect(
                            { id: member.id, name: member.name, positionName: member.positionName },
                            opt.value,
                          )
                        }
                        className="text-xs px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setOpenDropdownUserId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-1"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => !isDisabled && setOpenDropdownUserId(member.id)}
                    disabled={isDisabled}
                    title={
                      isSelf
                        ? '본인은 결재선에 추가할 수 없습니다'
                        : isDisabled
                          ? '이미 추가된 사용자입니다'
                          : '결재선에 추가'
                    }
                    className={`p-1 rounded transition-colors ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed text-gray-300'
                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
    </>
  );
}

export default function ApproverOrgTree({
  onAddApprover,
  disabledUserIds,
  currentUserId,
}: ApproverOrgTreeProps) {
  const { data: departments = [] } = useDepartmentTree();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div className="p-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">조직도</h4>
      <div className="max-h-[400px] overflow-y-auto" role="tree">
        {departments.map((dept) => (
          <DeptNode
            key={dept.id}
            node={dept}
            depth={0}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            onAddApprover={onAddApprover}
            disabledUserIds={disabledUserIds}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
