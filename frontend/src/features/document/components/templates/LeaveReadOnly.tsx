import { useTranslation } from 'react-i18next';
import { useLeaveTypes } from '../../hooks/useLeaveTypes';
import type { LeaveFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';
import DrafterInfoHeader from '../DrafterInfoHeader';

export default function LeaveReadOnly({
  formData,
  drafterSnapshot,
  drafterLive,
  submittedAt,
}: TemplateReadOnlyProps) {
  const { t } = useTranslation('document');
  const { data: leaveTypes = [] } = useLeaveTypes();

  if (!formData) {
    return (
      <div>
        <DrafterInfoHeader
          mode="submitted"
          snapshot={drafterSnapshot}
          live={drafterLive}
          submittedAt={submittedAt}
        />
        <p className="text-sm text-gray-400">내용 없음</p>
      </div>
    );
  }

  const data: LeaveFormData = JSON.parse(formData);
  const leaveTypeName =
    leaveTypes.find((lt) => lt.id === data.leaveTypeId)?.name ?? '-';

  return (
    <div>
      <DrafterInfoHeader
        mode="submitted"
        snapshot={drafterSnapshot}
        live={drafterLive}
        submittedAt={submittedAt}
      />
      <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('leave.type')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{leaveTypeName}</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('leave.days')}
          </label>
          <p className="text-base font-semibold text-blue-600">{data.days}일</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('leave.startDate')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{data.startDate}</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {data.startTime ? t('leave.endTime') : t('leave.endDate')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">
            {data.endDate ?? data.endTime ?? '-'}
          </p>
        </div>
      </div>

      {data.startTime && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('leave.startTime')}
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-50">{data.startTime}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('leave.endTime')}
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-50">{data.endTime ?? '-'}</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('leave.reason')}
        </label>
        <p className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
          {data.reason}
        </p>
      </div>
      </div>
    </div>
  );
}
