import type { OvertimeFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';

export default function OvertimeReadOnly({ formData }: TemplateReadOnlyProps) {
  if (!formData) {
    return <p className="text-sm text-gray-400">내용 없음</p>;
  }

  let data: OvertimeFormData;
  try {
    data = JSON.parse(formData) as OvertimeFormData;
  } catch {
    return <p className="text-sm text-gray-400">데이터 파싱 오류</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            근무일
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.workDate}
          </span>
        </div>
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            근무 시간
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.startTime} ~ {data.endTime} ({data.hours}시간)
          </span>
        </div>
      </div>

      <div>
        <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
          사유
        </span>
        <p className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
          {data.reason}
        </p>
      </div>
    </div>
  );
}
