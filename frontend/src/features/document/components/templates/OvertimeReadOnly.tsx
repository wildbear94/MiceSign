import { useTranslation } from 'react-i18next';
import type { OvertimeFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';
import DrafterInfoHeader from '../DrafterInfoHeader';

export default function OvertimeReadOnly({
  formData,
  drafterSnapshot,
  drafterLive,
  submittedAt,
}: TemplateReadOnlyProps) {
  const { t } = useTranslation('document');

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

  const data: OvertimeFormData = JSON.parse(formData);

  return (
    <div>
      <DrafterInfoHeader
        mode="submitted"
        snapshot={drafterSnapshot}
        live={drafterLive}
        submittedAt={submittedAt}
      />
      <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('overtime.workDate')}
        </label>
        <p className="text-sm text-gray-900 dark:text-gray-50">{data.workDate}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('overtime.startTime')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{data.startTime}</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('overtime.endTime')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{data.endTime}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('overtime.hours')}
        </label>
        <p className="text-base font-semibold text-blue-600">
          {data.hours > 0 ? `${data.hours}${t('overtime.hoursUnit')}` : '-'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('overtime.reason')}
        </label>
        <p className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
          {data.reason}
        </p>
      </div>
      </div>
    </div>
  );
}
