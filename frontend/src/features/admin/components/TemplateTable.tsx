import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { useToggleTemplate } from '../hooks/useTemplates';
import ConfirmDialog from './ConfirmDialog';
import type { TemplateListItem } from '../api/templateApi';

interface TemplateTableProps {
  templates: TemplateListItem[];
  isLoading: boolean;
  onEdit?: (template: TemplateListItem) => void;
}

export default function TemplateTable({ templates, isLoading, onEdit }: TemplateTableProps) {
  const { t } = useTranslation('admin');
  const toggleMutation = useToggleTemplate();
  const [confirmTarget, setConfirmTarget] = useState<TemplateListItem | null>(null);

  const handleToggleClick = (template: TemplateListItem) => {
    setConfirmTarget(template);
  };

  const handleConfirm = () => {
    if (!confirmTarget) return;
    const { id, isActive } = confirmTarget;
    toggleMutation.mutate(
      { id, activate: !isActive },
      {
        onSuccess: () => {
          toast.success(
            isActive
              ? t('templates.deactivatedSuccess')
              : t('templates.activatedSuccess'),
          );
          setConfirmTarget(null);
        },
        onError: () => {
          toast.error(t('templates.toggleError'));
          setConfirmTarget(null);
        },
      },
    );
  };

  const handleToggleKeyDown = (e: React.KeyboardEvent, template: TemplateListItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleClick(template);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('templates.emptyTitle')}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('templates.emptyBody')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <th scope="col" className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 px-4 py-3">
                {t('templates.code')}
              </th>
              <th scope="col" className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 px-4 py-3">
                {t('templates.name')}
              </th>
              <th scope="col" className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 px-4 py-3">
                {t('templates.description')}
              </th>
              <th scope="col" className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 px-4 py-3">
                {t('templates.prefix')}
              </th>
              <th scope="col" className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 px-4 py-3">
                {t('templates.status')}
              </th>
              <th scope="col" className="text-left text-sm font-normal text-gray-500 dark:text-gray-400 px-4 py-3">
                {t('common.edit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr
                key={template.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50 font-mono">
                  {template.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
                  {template.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                  {template.description}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {template.prefix}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        template.isActive
                          ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }
                    >
                      {template.isActive ? t('templates.active') : t('templates.inactive')}
                    </span>
                    <div
                      role="switch"
                      aria-checked={template.isActive}
                      aria-label={t('templates.title') + ' ' + template.name}
                      tabIndex={0}
                      onClick={() => handleToggleClick(template)}
                      onKeyDown={(e) => handleToggleKeyDown(e, template)}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors cursor-pointer ${
                        template.isActive
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div
                        className={`${
                          template.isActive ? 'translate-x-5' : 'translate-x-0'
                        } h-5 w-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ml-0.5`}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onEdit?.(template)}
                    className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors"
                    aria-label={`${template.name} ${t('common.edit')}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        title={
          confirmTarget
            ? confirmTarget.isActive
              ? t('templates.confirmDeactivate', { name: confirmTarget.name })
              : t('templates.confirmActivate', { name: confirmTarget.name })
            : ''
        }
        message={
          confirmTarget?.isActive
            ? t('templates.confirmDeactivateDesc')
            : ''
        }
        confirmLabel={
          confirmTarget
            ? confirmTarget.isActive
              ? t('templates.deactivateButton')
              : t('templates.activateButton')
            : ''
        }
        confirmVariant={confirmTarget?.isActive ? 'danger' : 'primary'}
        isLoading={toggleMutation.isPending}
      />
    </>
  );
}
