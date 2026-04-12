import { useTranslation } from 'react-i18next';
import type { SchemaField } from '../SchemaFieldEditor/types';

interface PreviewFieldRendererProps {
  field: SchemaField;
  value?: unknown;
  onChange?: (value: unknown) => void;
  dynamicRequired?: boolean;
}

const ENABLED_INPUT_CLASS =
  'w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors';

export default function PreviewFieldRenderer({ field, value, onChange, dynamicRequired }: PreviewFieldRendererProps) {
  const { t } = useTranslation('admin');

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={field.config.placeholder || ''}
            className={ENABLED_INPUT_CLASS}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange?.(e.target.value)}
            rows={3}
            placeholder={field.config.placeholder || ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none transition-colors"
          />
        );
      case 'number':
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={(value as string) || ''}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={field.config.placeholder || '0'}
              className={ENABLED_INPUT_CLASS}
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
            value={(value as string) || ''}
            onChange={(e) => onChange?.(e.target.value)}
            className={ENABLED_INPUT_CLASS}
          />
        );
      case 'select':
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange?.(e.target.value)}
            className={ENABLED_INPUT_CLASS}
          >
            <option value="">{t('templates.selectPlaceholder')}</option>
            {field.config.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label || opt.value}</option>
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
      case 'table': {
        const columns = field.config.columns || [];
        if (columns.length === 0) {
          return (
            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700 px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                {t('templates.columnEmpty')}
              </div>
            </div>
          );
        }
        return (
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {columns.map((col) => (
                    <th key={col.id} className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {col.label || t('templates.noLabel')}
                      {col.required && <span className="text-red-500 ml-1">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1].map((rowIdx) => (
                  <tr key={rowIdx} className="border-t border-gray-200 dark:border-gray-700">
                    {columns.map((col) => (
                      <td key={col.id} className="px-3 py-2">
                        {col.type === 'checkbox' ? (
                          <input type="checkbox" disabled className="w-4 h-4 rounded border-gray-300" />
                        ) : col.type === 'select' ? (
                          <select disabled className="w-full h-8 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-400">
                            <option>{t('templates.selectPlaceholder')}</option>
                          </select>
                        ) : col.type === 'date' ? (
                          <input type="date" disabled className="w-full h-8 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-400" />
                        ) : col.type === 'textarea' ? (
                          <textarea disabled rows={1} className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-400 resize-none" />
                        ) : col.type === 'staticText' ? (
                          <span className="text-xs text-gray-400">{col.config?.content || '-'}</span>
                        ) : (
                          <input type={col.type === 'number' ? 'number' : 'text'} disabled placeholder={col.config?.placeholder || ''} className="w-full h-8 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-400" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              disabled
              className="w-full py-2 text-sm text-gray-400 border-t border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-not-allowed"
            >
              + {t('templates.addRow')}
            </button>
          </div>
        );
      }
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
        {(field.required || dynamicRequired) && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
      </label>
      {renderInput()}
    </div>
  );
}
