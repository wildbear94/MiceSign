import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useLeaveTypes } from '../../hooks/useLeaveTypes';
import { calculateLeaveDays } from '../../utils/leaveDays';
import FileAttachmentArea from '../attachment/FileAttachmentArea';
import { leaveFormSchema, type LeaveFormValues } from '../../validations/leaveSchema';
import type { TemplateEditProps } from './templateRegistry';
import type { LeaveFormData } from '../../types/document';

export default function LeaveForm({
  documentId,
  initialData,
  onSave,
  readOnly = false,
}: TemplateEditProps) {
  const { t } = useTranslation('document');
  const { data: leaveTypes = [] } = useLeaveTypes();

  const parsedFormData: LeaveFormData | null = initialData?.formData
    ? JSON.parse(initialData.formData)
    : null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      leaveTypeId: parsedFormData?.leaveTypeId ?? 0,
      startDate: parsedFormData?.startDate ?? '',
      endDate: parsedFormData?.endDate ?? '',
      startTime: parsedFormData?.startTime ?? '',
      endTime: parsedFormData?.endTime ?? '',
      days: parsedFormData?.days ?? 0,
      reason: parsedFormData?.reason ?? '',
      emergencyContact: parsedFormData?.emergencyContact ?? '',
    },
  });

  useEffect(() => {
    if (initialData) {
      const fd: LeaveFormData | null = initialData.formData
        ? JSON.parse(initialData.formData)
        : null;
      reset({
        title: initialData.title,
        leaveTypeId: fd?.leaveTypeId ?? 0,
        startDate: fd?.startDate ?? '',
        endDate: fd?.endDate ?? '',
        startTime: fd?.startTime ?? '',
        endTime: fd?.endTime ?? '',
        days: fd?.days ?? 0,
        reason: fd?.reason ?? '',
        emergencyContact: fd?.emergencyContact ?? '',
      });
    }
  }, [initialData, reset]);

  const watchedLeaveTypeId = watch('leaveTypeId');
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((lt) => lt.id === Number(watchedLeaveTypeId)),
    [leaveTypes, watchedLeaveTypeId],
  );

  const isHalfDay = selectedLeaveType?.isHalfDay ?? false;

  // Auto-calculate days
  useEffect(() => {
    if (isHalfDay) {
      setValue('days', 0.5);
      return;
    }
    if (watchedStartDate && watchedEndDate) {
      const days = calculateLeaveDays(
        new Date(watchedStartDate),
        new Date(watchedEndDate),
        false,
      );
      setValue('days', days > 0 ? days : 0);
    }
  }, [watchedStartDate, watchedEndDate, isHalfDay, setValue]);

  const watchedDays = watch('days');

  const onSubmit = async (values: LeaveFormValues) => {
    const formData: LeaveFormData = {
      leaveTypeId: Number(values.leaveTypeId),
      startDate: values.startDate,
      endDate: values.endDate ?? null,
      startTime: values.startTime ?? null,
      endTime: values.endTime ?? null,
      days: values.days,
      reason: values.reason,
      emergencyContact: values.emergencyContact,
    };
    await onSave({
      title: values.title,
      bodyHtml: undefined,
      formData: JSON.stringify(formData),
    });
  };

  return (
    <form id="document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {t('template.LEAVE')}
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

      {/* Leave Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('leave.type')}
        </label>
        <select
          {...register('leaveTypeId', { valueAsNumber: true })}
          disabled={readOnly}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        >
          <option value={0}>{t('validation.leaveTypeRequired')}</option>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name}
            </option>
          ))}
        </select>
        {errors.leaveTypeId && (
          <p className="mt-1 text-sm text-red-600">{errors.leaveTypeId.message}</p>
        )}
      </div>

      {/* Date fields */}
      {isHalfDay ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('leave.startDate')}
            </label>
            <input
              {...register('startDate')}
              type="date"
              readOnly={readOnly}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('leave.startTime')}
            </label>
            <input
              {...register('startTime')}
              type="time"
              readOnly={readOnly}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('leave.endTime')}
            </label>
            <input
              {...register('endTime')}
              type="time"
              readOnly={readOnly}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('leave.startDate')}
            </label>
            <input
              {...register('startDate')}
              type="date"
              readOnly={readOnly}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('leave.endDate')}
            </label>
            <input
              {...register('endDate')}
              type="date"
              readOnly={readOnly}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Days display */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('leave.days')}
        </label>
        <div className="text-base font-semibold text-blue-600">
          {watchedDays > 0 ? `${watchedDays}일` : '-'}
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('leave.reason')}
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

      {/* File Attachments */}
      {documentId ? (
        <FileAttachmentArea
          documentId={documentId}
          documentStatus="DRAFT"
          readOnly={readOnly}
        />
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          {t('attachment.saveFirst')}
        </p>
      )}
    </form>
  );
}
