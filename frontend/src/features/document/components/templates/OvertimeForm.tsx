import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import FileAttachmentArea from '../attachment/FileAttachmentArea';
import DrafterInfoHeader from '../DrafterInfoHeader';
import { overtimeFormSchema, type OvertimeFormValues } from '../../validations/overtimeSchema';
import type { TemplateEditProps } from './templateRegistry';
import type { OvertimeFormData } from '../../types/document';

export default function OvertimeForm({
  documentId,
  initialData,
  onSave,
  readOnly = false,
  drafterLive,
}: TemplateEditProps) {
  const { t } = useTranslation('document');

  const parsedFormData: OvertimeFormData | null = initialData?.formData
    ? JSON.parse(initialData.formData)
    : null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OvertimeFormValues>({
    resolver: zodResolver(overtimeFormSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      workDate: parsedFormData?.workDate ?? '',
      startTime: parsedFormData?.startTime ?? '',
      endTime: parsedFormData?.endTime ?? '',
      hours: parsedFormData?.hours ?? 0,
      reason: parsedFormData?.reason ?? '',
    },
  });

  useEffect(() => {
    if (initialData) {
      const fd: OvertimeFormData | null = initialData.formData
        ? JSON.parse(initialData.formData)
        : null;
      reset({
        title: initialData.title,
        workDate: fd?.workDate ?? '',
        startTime: fd?.startTime ?? '',
        endTime: fd?.endTime ?? '',
        hours: fd?.hours ?? 0,
        reason: fd?.reason ?? '',
      });
    }
  }, [initialData, reset]);

  // Auto-calculate hours from time difference
  const watchedStartTime = watch('startTime');
  const watchedEndTime = watch('endTime');

  useEffect(() => {
    if (watchedStartTime && watchedEndTime) {
      const [startH, startM] = watchedStartTime.split(':').map(Number);
      const [endH, endM] = watchedEndTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const diffMinutes = endMinutes - startMinutes;
      if (diffMinutes > 0) {
        const hours = Math.round((diffMinutes / 60) * 10) / 10;
        setValue('hours', hours);
      } else {
        setValue('hours', 0);
      }
    }
  }, [watchedStartTime, watchedEndTime, setValue]);

  const watchedHours = watch('hours');

  const onSubmit = async (values: OvertimeFormValues) => {
    const formData: OvertimeFormData = {
      workDate: values.workDate,
      startTime: values.startTime,
      endTime: values.endTime,
      hours: values.hours,
      reason: values.reason,
    };
    await onSave({
      title: values.title,
      bodyHtml: undefined,
      formData: JSON.stringify(formData),
    });
  };

  return (
    <form id="document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <DrafterInfoHeader mode="draft" live={drafterLive} />
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {t('template.OVERTIME')}
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

      {/* Work Date */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('overtime.workDate')}
        </label>
        <input
          {...register('workDate')}
          type="date"
          readOnly={readOnly}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.workDate && (
          <p className="mt-1 text-sm text-red-600">{errors.workDate.message}</p>
        )}
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('overtime.startTime')}
          </label>
          <input
            {...register('startTime')}
            type="time"
            readOnly={readOnly}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('overtime.endTime')}
          </label>
          <input
            {...register('endTime')}
            type="time"
            readOnly={readOnly}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
          {errors.endTime && (
            <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      {/* Hours display */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('overtime.hours')}
        </label>
        <div className="text-base font-semibold text-blue-600">
          {watchedHours > 0 ? `${watchedHours}${t('overtime.hoursUnit')}` : '-'}
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('overtime.reason')}
        </label>
        <textarea
          {...register('reason')}
          readOnly={readOnly}
          className="w-full min-h-[80px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-y bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.reason && (
          <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
        )}
      </div>

      {/* Attachments */}
      {documentId ? (
        <FileAttachmentArea
          documentId={documentId}
          documentStatus="DRAFT"
          readOnly={readOnly}
        />
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          문서를 저장한 후 파일을 첨부할 수 있습니다.
        </p>
      )}
    </form>
  );
}
