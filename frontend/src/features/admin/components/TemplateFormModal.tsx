import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Eye, EyeOff, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useCreateTemplate, useUpdateTemplate, useTemplateDetail } from '../hooks/useTemplates';
import type { TemplateListItem } from '../api/templateApi';
import type { ApiResponse } from '../../../types/api';
import SchemaFieldEditor from './SchemaFieldEditor';
import type { SchemaField } from './SchemaFieldEditor';
import { FormPreview, FullscreenPreviewPortal } from './FormPreview';

const templateSchema = z.object({
  name: z.string().min(1, '양식 이름을 입력해주세요.').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  prefix: z.string().min(1, '접두어를 입력해주세요.').max(10),
  category: z.string().max(50).optional().or(z.literal('')),
  icon: z.string().max(50).optional().or(z.literal('')),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  editingTemplate: TemplateListItem | null;
  onSuccess?: () => void;
}

type TabKey = 'info' | 'fields';

export default function TemplateFormModal({
  open,
  onClose,
  editingTemplate,
  onSuccess,
}: TemplateFormModalProps) {
  const { t } = useTranslation('admin');
  const dialogRef = useRef<HTMLDivElement>(null);
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const detailQuery = useTemplateDetail(editingTemplate?.id ?? null);
  const isEdit = !!editingTemplate;
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setError: setFormError,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: '', description: '', prefix: '', category: '', icon: '' },
  });

  const watchedName = watch('name');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        reset({
          name: editingTemplate.name,
          description: editingTemplate.description || '',
          prefix: editingTemplate.prefix,
          category: editingTemplate.category || '',
          icon: editingTemplate.icon || '',
        });
      } else {
        reset({ name: '', description: '', prefix: '', category: '', icon: '' });
        setSchemaFields([]);
      }
      setActiveTab('info');
    }
  }, [open, editingTemplate, reset]);

  // Load schema from detail query when editing
  useEffect(() => {
    if (!open || !editingTemplate) return;
    if (detailQuery.data?.schemaDefinition) {
      try {
        const schema = JSON.parse(detailQuery.data.schemaDefinition);
        setSchemaFields(schema.fields || []);
      } catch {
        setSchemaFields([]);
      }
    } else if (detailQuery.data && !detailQuery.data.schemaDefinition) {
      setSchemaFields([]);
    }
  }, [open, editingTemplate, detailQuery.data]);

  // Focus trap + escape
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'input, textarea, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusableElements[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
          e.stopPropagation();
        } else {
          onClose();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, isFullscreen]);

  if (!open) return null;

  const onSubmit = async (data: TemplateFormData) => {
    const schemaDefinition = JSON.stringify({
      version: 1,
      fields: schemaFields,
      conditionalRules: [],
      calculationRules: [],
    });

    try {
      if (isEdit && editingTemplate) {
        await updateMutation.mutateAsync({
          id: editingTemplate.id,
          data: {
            name: data.name,
            description: data.description || undefined,
            category: data.category || undefined,
            icon: data.icon || undefined,
            schemaDefinition,
          },
        });
        toast.success(t('toast.templateUpdated'));
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          prefix: data.prefix,
          category: data.category || undefined,
          icon: data.icon || undefined,
          schemaDefinition,
        });
        toast.success(t('toast.templateCreated'));
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

  const inputClassName = (hasError: boolean) =>
    `w-full h-11 px-4 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors ${
      hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-[95vw] h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {isEdit ? t('templates.editTemplate') : t('templates.addTemplate')}
          </h2>
          <div className="flex items-center gap-2">
            {!showPreview && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                title={t('templates.previewShow')}
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: split layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left panel: editor */}
          <div className={`${showPreview ? 'w-1/2' : 'w-full'} overflow-y-auto p-6 flex flex-col`}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4" role="tablist">
                {([
                  { key: 'info' as TabKey, label: t('templates.tabInfo') },
                  { key: 'fields' as TabKey, label: t('templates.tabFields') },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: 기본 정보 */}
              <div className={activeTab === 'info' ? 'space-y-4' : 'hidden'}>
                {/* Name */}
                <div>
                  <label htmlFor="tpl-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('templates.templateName')}
                  </label>
                  <input
                    id="tpl-name"
                    type="text"
                    {...register('name')}
                    className={inputClassName(!!errors.name)}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="tpl-desc" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('templates.templateDescription')}
                  </label>
                  <textarea
                    id="tpl-desc"
                    rows={3}
                    {...register('description')}
                    className={`w-full px-4 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors resize-none ${
                      errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.description.message}</p>
                  )}
                </div>

                {/* Prefix (create-only) */}
                {!isEdit && (
                  <div>
                    <label htmlFor="tpl-prefix" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('templates.templatePrefix')}
                    </label>
                    <input
                      id="tpl-prefix"
                      type="text"
                      {...register('prefix')}
                      className={inputClassName(!!errors.prefix)}
                    />
                    {errors.prefix && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.prefix.message}</p>
                    )}
                  </div>
                )}

                {/* Category */}
                <div>
                  <label htmlFor="tpl-category" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('templates.templateCategory')}
                  </label>
                  <input
                    id="tpl-category"
                    type="text"
                    {...register('category')}
                    className={inputClassName(!!errors.category)}
                  />
                  {errors.category && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.category.message}</p>
                  )}
                </div>

                {/* Icon */}
                <div>
                  <label htmlFor="tpl-icon" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('templates.templateIcon')}
                  </label>
                  <input
                    id="tpl-icon"
                    type="text"
                    {...register('icon')}
                    className={inputClassName(!!errors.icon)}
                  />
                  {errors.icon && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.icon.message}</p>
                  )}
                </div>
              </div>

              {/* Tab: 필드 구성 */}
              <div className={activeTab === 'fields' ? '' : 'hidden'}>
                {isEdit && detailQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <SchemaFieldEditor fields={schemaFields} onChange={setSchemaFields} />
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-6">
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
                  {isEdit ? t('common.save') : t('templates.addTemplate')}
                </button>
              </div>
            </form>
          </div>

          {/* Right panel: preview */}
          {showPreview && (
            <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 flex flex-col">
              {/* Preview header */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('templates.preview')}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(true)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                    title={t('templates.previewFullscreen')}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                    title={t('templates.previewHide')}
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Preview body */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-900">
                <FormPreview fields={schemaFields} templateName={watchedName} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen preview portal */}
      {isFullscreen && (
        <FullscreenPreviewPortal
          fields={schemaFields}
          templateName={watchedName}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
