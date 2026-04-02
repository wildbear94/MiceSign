import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { useCreateDepartment, useUpdateDepartment } from '../hooks/useDepartments';
import type { DepartmentTreeNode } from '../../../types/admin';
import type { ApiResponse } from '../../../types/api';

const departmentSchema = z.object({
  name: z.string().min(1, '부서명을 입력해주세요.').max(100),
  parentId: z.number().nullable(),
  sortOrder: z.number().int().min(0),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

interface DepartmentFormModalProps {
  open: boolean;
  onClose: () => void;
  editingDepartment: DepartmentTreeNode | null;
  departments: DepartmentTreeNode[];
  onSuccess?: () => void;
}

/** Flatten a tree into a list of { id, name, depth } for the parent dropdown */
function flattenTree(
  nodes: DepartmentTreeNode[],
  depth = 0,
): Array<{ id: number; name: string; depth: number }> {
  const result: Array<{ id: number; name: string; depth: number }> = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

/** Collect IDs of a node and all its descendants */
function collectDescendantIds(node: DepartmentTreeNode): Set<number> {
  const ids = new Set<number>();
  ids.add(node.id);
  function walk(children: DepartmentTreeNode[]) {
    for (const child of children) {
      ids.add(child.id);
      walk(child.children);
    }
  }
  walk(node.children);
  return ids;
}

export default function DepartmentFormModal({
  open,
  onClose,
  editingDepartment,
  departments,
  onSuccess,
}: DepartmentFormModalProps) {
  const { t } = useTranslation('admin');
  const dialogRef = useRef<HTMLDivElement>(null);
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const isEdit = !!editingDepartment;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError: setFormError,
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      parentId: null,
      sortOrder: 0,
    },
  });

  // Reset form when modal opens or editing department changes
  useEffect(() => {
    if (open) {
      if (editingDepartment) {
        reset({
          name: editingDepartment.name,
          parentId: editingDepartment.parentId,
          sortOrder: editingDepartment.sortOrder,
        });
      } else {
        reset({ name: '', parentId: null, sortOrder: 0 });
      }
    }
  }, [open, editingDepartment, reset]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'input, select, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Build parent options, excluding self + descendants when editing
  const allFlat = flattenTree(departments);
  const excludeIds = editingDepartment ? collectDescendantIds(editingDepartment) : new Set<number>();
  const parentOptions = allFlat.filter((item) => !excludeIds.has(item.id));

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      if (isEdit && editingDepartment) {
        await updateMutation.mutateAsync({
          id: editingDepartment.id,
          data: { name: data.name, parentId: data.parentId, sortOrder: data.sortOrder },
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          parentId: data.parentId,
          sortOrder: data.sortOrder,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse<null>>;
      const errorCode = axiosError.response?.data?.error?.code;
      const errorMessage = axiosError.response?.data?.error?.message;
      if (errorCode && t(`errors.${errorCode}`, '') !== '') {
        setFormError('name', { message: t(`errors.${errorCode}`) });
      } else if (errorMessage) {
        setFormError('name', { message: errorMessage });
      } else {
        setFormError('name', { message: t('errors.NETWORK_ERROR') });
      }
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-[400px] mx-4"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
          {isEdit ? t('departments.editDepartment') : t('departments.addDepartment')}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Department name */}
          <div>
            <label htmlFor="dept-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('departments.departmentName')}
            </label>
            <input
              id="dept-name"
              type="text"
              {...register('name')}
              className={`w-full h-11 px-4 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Parent department */}
          <div>
            <label htmlFor="dept-parent" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('departments.parentDepartment')}
            </label>
            <select
              id="dept-parent"
              {...register('parentId', {
                setValueAs: (v: string) => (v === '' ? null : Number(v)),
              })}
              className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
            >
              <option value="">{t('departments.noParent')}</option>
              {parentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {'  '.repeat(opt.depth)}{opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort order */}
          <div>
            <label htmlFor="dept-sort" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              정렬 순서
            </label>
            <input
              id="dept-sort"
              type="number"
              min={0}
              {...register('sortOrder', { valueAsNumber: true })}
              className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.close')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-11 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? t('common.save') : t('departments.addDepartment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
