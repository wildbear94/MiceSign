import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { useCreatePosition, useUpdatePosition } from '../hooks/usePositions';
import type { PositionItem } from '../../../types/admin';
import type { ApiResponse } from '../../../types/api';

const positionSchema = z.object({
  name: z.string().min(1, '직급명을 입력해주세요.').max(50),
});

type PositionFormData = z.infer<typeof positionSchema>;

interface PositionFormModalProps {
  open: boolean;
  onClose: () => void;
  editingPosition: PositionItem | null;
  onSuccess?: () => void;
}

export default function PositionFormModal({
  open,
  onClose,
  editingPosition,
  onSuccess,
}: PositionFormModalProps) {
  const { t } = useTranslation('admin');
  const dialogRef = useRef<HTMLDivElement>(null);
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const isEdit = !!editingPosition;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError: setFormError,
  } = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: { name: '' },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (editingPosition) {
        reset({ name: editingPosition.name });
      } else {
        reset({ name: '' });
      }
    }
  }, [open, editingPosition, reset]);

  // Focus trap + escape
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'input, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusableElements[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = async (data: PositionFormData) => {
    try {
      if (isEdit && editingPosition) {
        await updateMutation.mutateAsync({
          id: editingPosition.id,
          data: { name: data.name },
        });
      } else {
        await createMutation.mutateAsync({ name: data.name });
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
          {isEdit ? t('positions.editPosition') : t('positions.addPosition')}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Position name */}
          <div>
            <label htmlFor="pos-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('positions.positionName')}
            </label>
            <input
              id="pos-name"
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

          {/* Sort order (read-only info in edit mode) */}
          {isEdit && editingPosition && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                정렬 순서
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {editingPosition.sortOrder} (드래그로 순서 변경 가능)
              </p>
            </div>
          )}

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
              {isEdit ? t('common.save') : t('positions.addPosition')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
