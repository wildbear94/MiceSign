import { useTranslation } from 'react-i18next';
import type { SchemaField } from '../SchemaFieldEditor/types';

interface PreviewFieldRendererProps {
  field: SchemaField;
}

const DISABLED_INPUT_CLASS =
  'w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 text-sm';

export default function PreviewFieldRenderer({ field }: PreviewFieldRendererProps) {
  const { t } = useTranslation('admin');

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            disabled
            placeholder={field.config.placeholder || ''}
            className={DISABLED_INPUT_CLASS}
          />
        );
      case 'textarea':
        return (
          <textarea
            disabled
            rows={3}
            placeholder={field.config.placeholder || ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 text-sm resize-none"
          />
        );
      case 'number':
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              disabled
              placeholder={field.config.placeholder || '0'}
              className={DISABLED_INPUT_CLASS}
            />
            {field.config.unit && (
              <span className="text-sm text-gray-500 flex-shrink-0">{field.config.unit}</span>
            )}
          </div>
        );
      case 'date':
        return (
          <input
            type="date"
            disabled
            className={DISABLED_INPUT_CLASS}
          />
        );
      case 'select':
        return (
          <select
            disabled
            className={DISABLED_INPUT_CLASS}
          >
            <option>{t('templates.selectPlaceholder')}</option>
            {field.config.options?.map((opt) => (
              <option key={opt.value}>{opt.label || opt.value}</option>
            ))}
          </select>
        );
      case 'staticText':
        return (
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {field.config.content || t('templates.staticTextPlaceholder')}
          </p>
        );
      case 'hidden':
        return null;
      case 'table':
        return (
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs text-gray-500">
              {t('templates.tableFieldPlaceholder')}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (field.type === 'hidden') {
    return null;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {field.label || t('templates.noLabel')}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
    </div>
  );
}
