import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLeaveTypes } from '../../hooks/useLeaveTypes';
import { calculateLeaveDays } from '../../utils/leaveDays';
import { leaveFormSchema, type LeaveFormValues } from '../../validations/leaveSchema';
import type { TemplateFormProps } from './templateRegistry';
import type { LeaveFormData } from '../../types/document';

function parseFormData(formData: string | null): LeaveFormData | null {
  if (!formData) return null;
  try {
    return JSON.parse(formData) as LeaveFormData;
  } catch {
    return null;
  }
}

export default function LeaveForm({
  formData,
  onChange,
  disabled = false,
}: TemplateFormProps) {
  const { data: leaveTypes = [] } = useLeaveTypes();
  const parsed = parseFormData(formData);
  const isFirstRender = useRef(true);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leaveType: parsed?.leaveTypeId?.toString() ?? '',
      startDate: parsed?.startDate ?? '',
      endDate: parsed?.endDate ?? '',
      days: parsed?.days ?? 0,
      reason: parsed?.reason ?? '',
      emergencyContact: parsed?.emergencyContact ?? '',
    },
  });

  const watchedLeaveType = watch('leaveType');
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');
  const watchedDays = watch('days');
  const watchedReason = watch('reason');
  const watchedEmergencyContact = watch('emergencyContact');

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((lt) => lt.id === Number(watchedLeaveType)),
    [leaveTypes, watchedLeaveType],
  );

  const isHalfDay = selectedLeaveType?.isHalfDay ?? false;

  // Auto-calculate days
  useEffect(() => {
    if (isHalfDay) {
      setValue('days', 0.5);
      return;
    }
    if (watchedStartDate && watchedEndDate) {
      const days = calculateLeaveDays(watchedStartDate, watchedEndDate, false);
      setValue('days', days > 0 ? days : 0);
    }
  }, [watchedStartDate, watchedEndDate, isHalfDay, setValue]);

  // Notify parent on changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const data: LeaveFormData = {
      leaveTypeId: Number(watchedLeaveType) || 0,
      startDate: watchedStartDate,
      endDate: watchedEndDate || null,
      days: watchedDays,
      reason: watchedReason,
      emergencyContact: watchedEmergencyContact,
    };
    onChange({ formData: JSON.stringify(data) });
  }, [
    watchedLeaveType,
    watchedStartDate,
    watchedEndDate,
    watchedDays,
    watchedReason,
    watchedEmergencyContact,
    onChange,
  ]);

  return (
    <div className="space-y-4">
      {/* Leave Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          휴가 유형
        </label>
        <select
          {...register('leaveType')}
          disabled={disabled}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        >
          <option value="">휴가 유형을 선택해주세요</option>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name}
            </option>
          ))}
        </select>
        {errors.leaveType && (
          <p className="mt-1 text-sm text-red-600">{errors.leaveType.message}</p>
        )}
      </div>

      {/* Date fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            시작일
          </label>
          <input
            {...register('startDate')}
            type="date"
            readOnly={disabled}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            종료일
          </label>
          <input
            {...register('endDate')}
            type="date"
            readOnly={disabled}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      {/* Days display */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          사용 일수
        </label>
        <div className="text-base font-semibold text-blue-600">
          {watchedDays > 0 ? `${watchedDays}일` : '-'}
        </div>
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

      {/* Emergency Contact */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          비상 연락처
        </label>
        <input
          {...register('emergencyContact')}
          type="text"
          readOnly={disabled}
          placeholder="비상 시 연락 가능한 번호"
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
      </div>
    </div>
  );
}
