import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import TiptapEditor from '../TiptapEditor';
import FileAttachmentArea from '../attachment/FileAttachmentArea';
import { generalFormSchema, type GeneralFormValues } from '../../validations/generalSchema';
import type { TemplateEditProps } from './templateRegistry';

export default function GeneralForm({
  documentId,
  initialData,
  onSave,
  readOnly = false,
}: TemplateEditProps) {
  const { t } = useTranslation('document');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GeneralFormValues>({
    resolver: zodResolver(generalFormSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      bodyHtml: initialData?.bodyHtml ?? '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        bodyHtml: initialData.bodyHtml ?? '',
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (values: GeneralFormValues) => {
    await onSave({
      title: values.title,
      bodyHtml: values.bodyHtml,
      formData: undefined,
    });
  };

  return (
    <form id="document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {t('template.GENERAL')}
      </div>

      {/* Title */}
      <div>
        <input
          {...register('title')}
          type="text"
          placeholder={t('validation.titleRequired')}
          readOnly={readOnly}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Tiptap Editor */}
      <div>
        <Controller
          name="bodyHtml"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              content={field.value}
              onChange={field.onChange}
              editable={!readOnly}
            />
          )}
        />
        {errors.bodyHtml && (
          <p className="mt-1 text-sm text-red-600">{errors.bodyHtml.message}</p>
        )}
      </div>

      {/* Attachments */}
      {documentId ? (
        <FileAttachmentArea
          documentId={documentId}
          documentStatus="DRAFT"
          readOnly={false}
        />
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          문서를 저장한 후 파일을 첨부할 수 있습니다.
        </p>
      )}
    </form>
  );
}
