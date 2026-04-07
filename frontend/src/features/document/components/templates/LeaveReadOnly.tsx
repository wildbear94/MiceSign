import { useLeaveTypes } from '../../hooks/useLeaveTypes';
import type { LeaveFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';

export default function LeaveReadOnly({ formData }: TemplateReadOnlyProps) {
  const { data: leaveTypes = [] } = useLeaveTypes();

  if (!formData) {
    return <p className="text-sm text-gray-400">내용 없음</p>;
  }

  let data: LeaveFormData;
  try {
    data = JSON.parse(formData) as LeaveFormData;
  } catch {
    return <p className="text-sm text-gray-400">데이터 파싱 오류</p>;
  }

  const leaveTypeName =
    leaveTypes.find((lt) => lt.id === data.leaveTypeId)?.name ?? '-';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            휴가 유형
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {leaveTypeName}
          </span>
        </div>
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            사용 일수
          </span>
          <span className="text-base font-semibold text-blue-600">
            {data.days}일
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            시작일
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.startDate}
          </span>
        </div>
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            종료일
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.endDate ?? '-'}
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

      {data.emergencyContact && (
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            비상 연락처
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.emergencyContact}
          </span>
        </div>
      )}
    </div>
  );
}
