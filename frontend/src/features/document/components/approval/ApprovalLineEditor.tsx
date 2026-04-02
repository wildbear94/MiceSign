import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../../../../stores/authStore';
import type { ApprovalLineItem, ApprovalLineType } from '../../../approval/types/approval';
import ApproverOrgTree from './ApproverOrgTree';
import ApprovalLineList from './ApprovalLineList';

interface ApprovalLineEditorProps {
  items: ApprovalLineItem[];
  onItemsChange: (items: ApprovalLineItem[]) => void;
  readOnly?: boolean;
}

export default function ApprovalLineEditor({
  items,
  onItemsChange,
  readOnly,
}: ApprovalLineEditorProps) {
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id ?? 0;

  // Compute disabled user IDs: already-added users + self
  const disabledUserIds = useMemo(() => {
    const ids = items.map((i) => i.userId);
    if (currentUserId && !ids.includes(currentUserId)) {
      ids.push(currentUserId);
    }
    return ids;
  }, [items, currentUserId]);

  const addApprover = useCallback(
    (
      user: { id: number; name: string; departmentName: string; positionName: string | null },
      lineType: ApprovalLineType,
    ) => {
      // Prevent duplicates (D-07)
      if (items.some((i) => i.userId === user.id)) return;
      // Prevent self (D-06)
      if (user.id === currentUserId) return;

      const newItem: ApprovalLineItem = {
        userId: user.id,
        userName: user.name,
        departmentName: user.departmentName,
        positionName: user.positionName,
        lineType,
      };
      onItemsChange([...items, newItem]);
    },
    [items, currentUserId, onItemsChange],
  );

  const removeApprover = useCallback(
    (userId: number) => {
      onItemsChange(items.filter((i) => i.userId !== userId));
    },
    [items, onItemsChange],
  );

  const reorderApprovers = useCallback(
    (fromIndex: number, toIndex: number) => {
      // Only reorder non-REFERENCE items
      const approveAgree = items.filter((i) => i.lineType !== 'REFERENCE');
      const references = items.filter((i) => i.lineType === 'REFERENCE');

      const reordered = [...approveAgree];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      onItemsChange([...reordered, ...references]);
    },
    [items, onItemsChange],
  );

  const changeType = useCallback(
    (userId: number, lineType: ApprovalLineType) => {
      onItemsChange(
        items.map((i) => (i.userId === userId ? { ...i, lineType } : i)),
      );
    },
    [items, onItemsChange],
  );

  if (readOnly) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl mt-6">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">결재선 설정</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[200px]">
        {/* Left panel - Org tree */}
        <div className="md:border-r border-gray-200 dark:border-gray-700">
          <ApproverOrgTree
            onAddApprover={addApprover}
            disabledUserIds={disabledUserIds}
            currentUserId={currentUserId}
          />
        </div>

        {/* Right panel - Approval line list */}
        <div>
          <ApprovalLineList
            items={items}
            onReorder={reorderApprovers}
            onTypeChange={changeType}
            onRemove={removeApprover}
          />
        </div>
      </div>
    </div>
  );
}
