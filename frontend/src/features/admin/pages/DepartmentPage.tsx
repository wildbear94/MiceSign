import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, FolderOpen } from 'lucide-react';
import DepartmentTree from '../components/DepartmentTree';
import DepartmentDetailPanel from '../components/DepartmentDetailPanel';
import DepartmentFormModal from '../components/DepartmentFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useDepartmentTree, useDeactivateDepartment } from '../hooks/useDepartments';
import type { DepartmentTreeNode } from '../../../types/admin';

/** Walk tree to collect matching nodes and their ancestor IDs */
function filterTree(
  nodes: DepartmentTreeNode[],
  searchText: string,
): DepartmentTreeNode[] {
  const lower = searchText.toLowerCase();

  function matches(node: DepartmentTreeNode): boolean {
    return node.name.toLowerCase().includes(lower);
  }

  function filterNode(node: DepartmentTreeNode): DepartmentTreeNode | null {
    const selfMatches = matches(node);
    const filteredChildren = node.children
      .map(filterNode)
      .filter((child): child is DepartmentTreeNode => child !== null);

    if (selfMatches || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  }

  return nodes
    .map(filterNode)
    .filter((node): node is DepartmentTreeNode => node !== null);
}

export default function DepartmentPage() {
  const { t } = useTranslation('admin');

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Selection state
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentTreeNode | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivatingDepartment, setDeactivatingDepartment] = useState<DepartmentTreeNode | null>(null);

  // Data
  const { data: departments = [], isLoading } = useDepartmentTree(includeInactive);
  const deactivateMutation = useDeactivateDepartment();

  // Client-side filter
  const filteredDepartments = useMemo(() => {
    if (!searchText.trim()) return departments;
    return filterTree(departments, searchText.trim());
  }, [departments, searchText]);

  const handleSelect = useCallback((dept: DepartmentTreeNode) => {
    setSelectedDepartmentId(dept.id);
    setSelectedDepartmentName(dept.name);
  }, []);

  const handleEdit = useCallback((dept: DepartmentTreeNode) => {
    setEditingDepartment(dept);
  }, []);

  const handleDeactivate = useCallback((dept: DepartmentTreeNode) => {
    setDeactivatingDepartment(dept);
    setShowDeactivateConfirm(true);
  }, []);

  const confirmDeactivate = async () => {
    if (!deactivatingDepartment) return;
    try {
      await deactivateMutation.mutateAsync(deactivatingDepartment.id);
      setShowDeactivateConfirm(false);
      setDeactivatingDepartment(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleEditFromDetail = useCallback(() => {
    // Find the selected department in the tree to pass to the edit modal
    function findNode(nodes: DepartmentTreeNode[], id: number): DepartmentTreeNode | null {
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.children, id);
        if (found) return found;
      }
      return null;
    }
    if (selectedDepartmentId) {
      const node = findNode(departments, selectedDepartmentId);
      if (node) setEditingDepartment(node);
    }
  }, [selectedDepartmentId, departments]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          {t('departments.title')}
        </h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 h-11 flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('departments.addDepartment')}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col md:flex-row gap-0 min-h-[500px]">
        {/* Left: Tree panel */}
        <div className="w-full md:w-2/5">
          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="부서명 검색"
                className="w-full h-9 pl-9 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
              />
            </div>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              {t('departments.showInactive')}
            </label>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded animate-pulse h-6 w-3/4" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && departments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                부서가 없습니다. 첫 부서를 추가해주세요.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 h-11 flex items-center gap-1 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('departments.addDepartment')}
              </button>
            </div>
          )}

          {/* Tree */}
          {!isLoading && filteredDepartments.length > 0 && (
            <DepartmentTree
              departments={filteredDepartments}
              selectedId={selectedDepartmentId}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
            />
          )}
        </div>

        {/* Right: Detail panel */}
        <div className="w-full md:w-3/5 min-h-[300px]">
          <DepartmentDetailPanel
            departmentId={selectedDepartmentId}
            departmentName={selectedDepartmentName}
            onEdit={handleEditFromDetail}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <DepartmentFormModal
        open={showCreateModal || !!editingDepartment}
        onClose={() => {
          setShowCreateModal(false);
          setEditingDepartment(null);
        }}
        editingDepartment={editingDepartment}
        departments={departments}
      />

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={showDeactivateConfirm}
        onClose={() => {
          setShowDeactivateConfirm(false);
          setDeactivatingDepartment(null);
        }}
        onConfirm={confirmDeactivate}
        title="부서 비활성화"
        message={
          deactivatingDepartment
            ? t('departments.confirmDeactivate', { name: deactivatingDepartment.name })
            : ''
        }
        confirmLabel={t('common.deactivate')}
        confirmVariant="danger"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
