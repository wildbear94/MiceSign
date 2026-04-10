import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { organizationApi } from '../api/organizationApi';
import OrgTreePickerNode from './OrgTreePickerNode';
import type { DepartmentTreeNode } from '../../../types/admin';
import type { ApprovalLineItem } from '../types/approval';

interface OrgTreePickerModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: ApprovalLineItem) => void;
  currentLineUserIds: number[];
  drafterId: number;
  currentCount: number;
  maxCount?: number;
}

function filterTree(
  nodes: DepartmentTreeNode[],
  query: string,
): DepartmentTreeNode[] {
  if (!query) return nodes;
  const lower = query.toLowerCase();

  return nodes.reduce<DepartmentTreeNode[]>((acc, node) => {
    const nameMatch = node.name.toLowerCase().includes(lower);
    const filteredChildren = filterTree(node.children, query);

    // Keep node if its name matches or if any child matches (ancestor chain)
    if (nameMatch || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren,
      });
    }
    return acc;
  }, []);
}

export default function OrgTreePickerModal({
  open,
  onClose,
  onAdd,
  currentLineUserIds,
  drafterId,
  currentCount,
  maxCount = 10,
}: OrgTreePickerModalProps) {
  const { t } = useTranslation('approval');
  const [searchQuery, setSearchQuery] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch department tree when modal opens
  const { data: tree } = useQuery({
    queryKey: ['department-tree-picker'],
    queryFn: async () => {
      const res = await organizationApi.getTree();
      return res.data.data;
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const filteredTree = filterTree(tree ?? [], searchQuery);

  // Reset search when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dialog = dialogRef.current;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    dialog.addEventListener('keydown', handleTab);
    return () => dialog.removeEventListener('keydown', handleTab);
  }, [open]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-picker-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-[480px] w-full mx-4 max-h-[70vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="org-picker-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-50"
          >
            {t('orgPicker.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('orgPicker.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-6 py-2" role="tree">
          {filteredTree.map((node) => (
            <OrgTreePickerNode
              key={node.id}
              node={node}
              depth={0}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('orgPicker.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
