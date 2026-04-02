import { ChevronRight, Pencil, Power } from 'lucide-react';
import type { DepartmentTreeNode as DeptNode } from '../../../types/admin';

interface DepartmentTreeNodeProps {
  node: DeptNode;
  depth: number;
  selectedId: number | null;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onSelect: (dept: DeptNode) => void;
  onEdit: (dept: DeptNode) => void;
  onDeactivate: (dept: DeptNode) => void;
}

export default function DepartmentTreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onEdit,
  onDeactivate,
}: DepartmentTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSelect(node);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (hasChildren) {
        onToggleExpand(node.id);
      }
    }
  };

  return (
    <div role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-level={depth + 1}>
      <div
        className={`group flex items-center gap-1 px-2 py-2 rounded cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        } ${!node.isActive ? 'opacity-50' : ''}`}
        style={{ marginLeft: `${depth * 16}px` }}
        onClick={() => onSelect(node)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Expand/collapse chevron */}
        <span
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(node.id);
          }}
        >
          {hasChildren && (
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-150 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          )}
        </span>

        {/* Department name */}
        <span className="text-sm truncate">{node.name}</span>

        {/* Member count badge */}
        <span className="text-xs text-gray-400 ml-1">({node.memberCount})</span>

        {/* Inactive badge */}
        {!node.isActive && (
          <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded ml-1">
            비활성
          </span>
        )}

        {/* Context actions on hover */}
        <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
            className="p-1 rounded text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            aria-label="수정"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {node.isActive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeactivate(node);
              }}
              className="p-1 rounded text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              aria-label="비활성화"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          )}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div role="group">
          {node.children.map((child) => (
            <DepartmentTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
