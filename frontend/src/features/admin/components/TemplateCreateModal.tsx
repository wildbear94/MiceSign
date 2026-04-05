import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCreateTemplate } from '../hooks/useAdminTemplates';

const createTemplateSchema = z.object({
  name: z.string().min(1, '양식 이름을 입력해주세요').max(100),
  prefix: z
    .string()
    .min(1, '접두사를 입력해주세요')
    .max(10)
    .regex(/^[A-Z]+$/, '영문 대문자만 입력 가능합니다'),
  description: z.string().max(500).optional(),
});

type CreateTemplateFormData = z.infer<typeof createTemplateSchema>;

interface TemplateCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

export default function TemplateCreateModal({
  isOpen,
  onClose,
  onCreated,
}: TemplateCreateModalProps) {
  const { t } = useTranslation('admin');
  const createMutation = useCreateTemplate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTemplateFormData>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: '',
      prefix: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
      createMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onSubmit = async (data: CreateTemplateFormData) => {
    try {
      const response = await createMutation.mutateAsync({
        name: data.name,
        prefix: data.prefix,
        description: data.description || undefined,
      });
      const createdId = response.data.data?.id;
      if (createdId) {
        onCreated(createdId);
      }
      onClose();
    } catch {
      // Error is captured by mutation state
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('templates.createModalTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="template-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('templates.name')} <span className="text-red-500">*</span>
            </label>
            <input
              id="template-name"
              type="text"
              {...register('name')}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('templates.name')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Prefix */}
          <div>
            <label
              htmlFor="template-prefix"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('templates.prefix')} <span className="text-red-500">*</span>
            </label>
            <input
              id="template-prefix"
              type="text"
              {...register('prefix')}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="GEN"
            />
            {errors.prefix && (
              <p className="mt-1 text-xs text-red-500">{errors.prefix.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="template-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('templates.description')}
            </label>
            <textarea
              id="template-description"
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('templates.description')}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Error message */}
          {createMutation.isError && (
            <p className="text-sm text-red-500">
              {t('templates.saveError')}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="h-10 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {t('common.cancel', '취소')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="h-10 px-4 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.add', '추가')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
