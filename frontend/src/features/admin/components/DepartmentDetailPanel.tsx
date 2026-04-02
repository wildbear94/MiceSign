import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDepartmentMembers } from '../hooks/useDepartments';

interface DepartmentDetailPanelProps {
  departmentId: number | null;
  departmentName: string;
  onEdit: () => void;
}

export default function DepartmentDetailPanel({
  departmentId,
  departmentName,
  onEdit,
}: DepartmentDetailPanelProps) {
  const { t } = useTranslation('admin');
  const { data: members, isLoading } = useDepartmentMembers(departmentId);

  if (!departmentId) {
    return (
      <div className="border-l border-gray-200 dark:border-gray-700 flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">부서를 선택해주세요.</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return (
        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          활성
        </span>
      );
    }
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        비활성
      </span>
    );
  };

  return (
    <div className="border-l border-gray-200 dark:border-gray-700 h-full overflow-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {departmentName}
          </h3>
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Pencil className="w-4 h-4" />
            <span>{t('common.edit')}</span>
          </button>
        </div>

        {/* Member list header */}
        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
          {t('departments.members')}
        </h4>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded animate-pulse h-6 w-3/4" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && members && members.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            {t('departments.emptyMembers')}
          </p>
        )}

        {/* Member list */}
        {!isLoading && members && members.length > 0 && (
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div>
                  <span className="text-sm text-gray-900 dark:text-gray-50 font-medium">
                    {member.name}
                  </span>
                  {member.positionName && (
                    <span className="text-xs text-gray-400 ml-2">
                      {member.positionName}
                    </span>
                  )}
                </div>
                {statusBadge(member.status)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
