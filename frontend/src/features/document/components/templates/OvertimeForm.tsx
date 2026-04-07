import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { overtimeFormSchema, type OvertimeFormValues } from '../../validations/overtimeSchema';
import type { TemplateFormProps } from './templateRegistry';
import type { OvertimeFormData } from '../../types/document';

function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  // Handle overnight: if end is before start, add 24 hours
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  const diffMinutes = endMinutes - startMinutes;
  // Round to 0.5h increments
  return Math.round((diffMinutes / 60) * 2) / 2;
}

function parseFormData(raw: string | null): OvertimeFormData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OvertimeFormData;
  } catch {
    return null;
  }
}

export default function OvertimeForm({
  formData,
  onChange,
  disabled = false,
}: TemplateFormProps) {
  const parsed = parseFormData(formData);
  const isFirstRender = useRef(true);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OvertimeFormValues>({
    resolver: zodResolver(overtimeFormSchema),
    defaultValues: {
      workDate: parsed?.workDate ?? '',
      startTime: parsed?.startTime ?? '',
      endTime: parsed?.endTime ?? '',
      hours: parsed?.hours ?? 0,
      reason: parsed?.reason ?? '',
      managerName: '',
    },
  });

  const watchedWorkDate = watch('workDate');
  const watchedStartTime = watch('startTime');
  const watchedEndTime = watch('endTime');
  const watchedHours = watch('hours');
  const watchedReason = watch('reason');
  const watchedManagerName = watch('managerName');

  // Auto-calculate hours
  useEffect(() => {
    const hours = calculateHours(watchedStartTime, watchedEndTime);
    setValue('hours', hours);
  }, [watchedStartTime, watchedEndTime, setValue]);

  // Notify parent on changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const data: OvertimeFormData = {
      workDate: watchedWorkDate,
      startTime: watchedStartTime,
      endTime: watchedEndTime,
      hours: watchedHours,
      reason: watchedReason,
    };
    onChange({ formData: JSON.stringify(data) });
  }, [
    watchedWorkDate,
    watchedStartTime,
    watchedEndTime,
    watchedHours,
    watchedReason,
    watchedManagerName,
    onChange,
  ]);

  return (
    <div className="space-y-4">
      {/* Work Date */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          근무일
        </label>
        <input
          {...register('workDate')}
          type="date"
          readOnly={disabled}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.workDate && (
          <p className="mt-1 text-sm text-red-600">{errors.workDate.message}</p>
        )}
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            시작 시간
          </label>
          <input
            {...register('startTime')}
            type="time"
            readOnly={disabled}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            종료 시간
          </label>
          <input
            {...register('endTime')}
            type="time"
            readOnly={disabled}
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
          근무 시간
        </label>
        <div className="text-base font-semibold text-blue-600">
          {watchedHours > 0 ? `${watchedHours}시간` : '-'}
        </div>
        {errors.hours && (
          <p className="mt-1 text-sm text-red-600">{errors.hours.message}</p>
        )}
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          사유
        </label>
        <textarea
          {...register('reason')}
          readOnly={disabled}
          rows={3}
          className="w-full min-h-[80px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-y bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.reason && (
          <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
        )}
      </div>

      {/* Manager Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          관리자명
        </label>
        <input
          {...register('managerName')}
          type="text"
          readOnly={disabled}
          placeholder="직속 관리자 이름"
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
      </div>
    </div>
  );
}
