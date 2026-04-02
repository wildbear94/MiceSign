import { useState, useEffect, useCallback } from 'react';
import DepartmentTreeNode from './DepartmentTreeNode';
import type { DepartmentTreeNode as DeptNode } from '../../../types/admin';

interface DepartmentTreeProps {
  departments: DeptNode[];
  selectedId: number | null;
  onSelect: (dept: DeptNode) => void;
  onEdit: (dept: DeptNode) => void;
  onDeactivate: (dept: DeptNode) => void;
}

function collectAllIds(nodes: DeptNode[]): Set<number> {
  const ids = new Set<number>();
  function walk(list: DeptNode[]) {
    for (const node of list) {
      ids.add(node.id);
      if (node.children.length > 0) walk(node.children);
    }
  }
  walk(nodes);
  return ids;
}

export default function DepartmentTree({
  departments,
  selectedId,
  onSelect,
  onEdit,
  onDeactivate,
}: DepartmentTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Expand all nodes by default when data loads
  useEffect(() => {
    if (departments.length > 0) {
      setExpandedIds(collectAllIds(departments));
    }
  }, [departments]);

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
    <div role="tree">
      {departments.map((dept) => (
        <DepartmentTreeNode
          key={dept.id}
          node={dept}
          depth={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          onSelect={onSelect}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
        />
      ))}
    </div>
  );
}
