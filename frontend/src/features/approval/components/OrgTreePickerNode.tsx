import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { departmentApi } from '../../admin/api/departmentApi';
import type { DepartmentTreeNode } from '../../../types/admin';
import type { ApprovalLineItem, ApprovalLineType } from '../types/approval';

interface OrgTreePickerNodeProps {
  node: DepartmentTreeNode;
  depth: number;
  currentLineUserIds: number[];
  drafterId: number;
  currentCount: number;
  maxCount: number;
  onAdd: (item: ApprovalLineItem) => void;
  searchQuery: string;
  defaultExpanded?: boolean;
}

export default function OrgTreePickerNode({
  node,
  depth,
  currentLineUserIds,
  drafterId,
  currentCount,
  maxCount,
  onAdd,
  searchQuery,
  defaultExpanded = false,
}: OrgTreePickerNodeProps) {
  const { t } = useTranslation('approval');
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [selectedTypes, setSelectedTypes] = useState<Record<number, ApprovalLineType>>({});

  // Sync expanded state when search causes defaultExpanded to change
  useEffect(() => {
    if (defaultExpanded) {
      setExpanded(true);
    }
  }, [defaultExpanded]);

  const hasChildren = node.children.length > 0;

  // Fetch members when expanded
  const { data: members } = useQuery({
    queryKey: ['department-members', node.id],
    queryFn: async () => {
      const res = await departmentApi.getMembers(node.id);
      return res.data.data;
    },
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  });

  // Filter active members
  const activeMembers = (members ?? []).filter((m) => m.status === 'ACTIVE');

  // Filter members by search query
  const filteredMembers = searchQuery
    ? activeMembers.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : activeMembers;

  const isMaxReached = currentCount >= maxCount;

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  const handleAdd = (member: { id: number; name: string; positionName: string | null }) => {
    const lineType = selectedTypes[member.id] ?? 'APPROVE';
    onAdd({
      userId: member.id,
      userName: member.name,
      departmentName: node.name,
      positionName: member.positionName,
      lineType,
    });
  };

  const handleTypeChange = (memberId: number, type: ApprovalLineType) => {
    setSelectedTypes((prev) => ({ ...prev, [memberId]: type }));
  };

  return (
    <div>
      {/* Department row */}
      <div
        className="flex items-center gap-1 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={handleToggle}
        role="treeitem"
        aria-expanded={hasChildren || activeMembers.length > 0 ? expanded : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {node.name}
        </span>
      </div>

      {/* Members + children when expanded */}
      {expanded && (
        <div role="group">
          {/* Member list */}
          {filteredMembers.map((member) => {
            const isAlreadyAdded = currentLineUserIds.includes(member.id);
            const isSelf = member.id === drafterId;
            const isDisabled = isAlreadyAdded || isSelf || isMaxReached;

            return (
              <div
                key={member.id}
                className="flex items-center gap-2 py-2 px-3"
                style={{ paddingLeft: (depth + 1) * 16 + 16 }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {member.name}
                  </span>
                  {member.positionName && (
                    <>
                      <span className="text-sm text-gray-400 mx-1">|</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {member.positionName}
                      </span>
                    </>
                  )}
                </div>

                {isDisabled ? (
                  <span className="h-8 px-2 bg-gray-100 dark:bg-gray-700 text-gray-400 text-xs rounded cursor-not-allowed flex items-center">
                    {isSelf
                      ? t('approvalLine.self')
                      : isAlreadyAdded
                        ? t('approvalLine.alreadyAdded')
                        : t('approvalLine.maxWarning')}
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <select
                      value={selectedTypes[member.id] ?? 'APPROVE'}
                      onChange={(e) =>
                        handleTypeChange(
                          member.id,
                          e.target.value as ApprovalLineType,
                        )
                      }
                      className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="APPROVE">{t('typeShort.APPROVE')}</option>
                      <option value="AGREE">{t('typeShort.AGREE')}</option>
                      <option value="REFERENCE">{t('typeShort.REFERENCE')}</option>
                    </select>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(member);
                      }}
                      className="h-8 px-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-medium rounded flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Child departments */}
          {node.children.map((child) => (
            <OrgTreePickerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentLineUserIds={currentLineUserIds}
              drafterId={drafterId}
              currentCount={currentCount}
              maxCount={maxCount}
              onAdd={onAdd}
              searchQuery={searchQuery}
              defaultExpanded={searchQuery.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
