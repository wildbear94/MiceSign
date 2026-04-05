import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { FileText } from 'lucide-react';
import type { AdminTemplateResponse } from '../types/builder';

interface TemplateListTableProps {
  templates: AdminTemplateResponse[];
  onEdit: (id: number) => void;
  onDeactivate: (id: number) => void;
}

export default function TemplateListTable({
  templates,
  onEdit,
  onDeactivate,
}: TemplateListTableProps) {
  const { t } = useTranslation('admin');

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-1">
          {t('templates.emptyList')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('templates.emptyListDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-400">
            <th className="text-left px-4 py-3">{t('templates.name')}</th>
            <th className="text-left px-4 py-3 w-24">{t('templates.prefix')}</th>
            <th className="text-center px-4 py-3 w-20">{t('templates.fieldCount')}</th>
            <th className="text-center px-4 py-3 w-20">{t('templates.version')}</th>
            <th className="text-center px-4 py-3 w-20">{t('templates.active', '상태')}</th>
            <th className="text-left px-4 py-3 w-40">{t('templates.lastModified')}</th>
            <th className="text-right px-4 py-3 w-36">{t('common.actions', '작업')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {templates.map((template) => (
            <tr
              key={template.id}
              className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {/* Name */}
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onEdit(template.id)}
                  className="text-sm font-semibold text-gray-900 dark:text-gray-50 hover:text-blue-600 dark:hover:text-blue-400 text-left"
                >
                  {template.name}
                </button>
              </td>

              {/* Prefix */}
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                {template.prefix}
              </td>

              {/* Field count */}
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                {template.fieldCount}
              </td>

              {/* Version */}
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                v{template.schemaVersion}
              </td>

              {/* Status */}
              <td className="px-4 py-3 text-center">
                {template.isActive ? (
                  <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs px-2 py-0.5 rounded">
                    {t('templates.active', '활성')}
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-xs px-2 py-0.5 rounded">
                    {t('templates.inactive', '비활성')}
                  </span>
                )}
              </td>

              {/* Last modified */}
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {format(parseISO(template.updatedAt), 'yyyy-MM-dd HH:mm')}
              </td>

              {/* Actions */}
              <td className="px-4 py-3 text-right">
                <span className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(template.id)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                  >
                    {t('common.edit', '수정')}
                  </button>
                  {template.isBuiltIn ? (
                    <span
                      className="text-gray-400 dark:text-gray-500 text-sm cursor-not-allowed"
                      title="기본 양식은 비활성화할 수 없습니다"
                    >
                      {t('templates.deactivate', '비활성화')}
                    </span>
                  ) : (
                    template.isActive && (
                      <button
                        type="button"
                        onClick={() => onDeactivate(template.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                      >
                        {t('templates.deactivate', '비활성화')}
                      </button>
                    )
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
