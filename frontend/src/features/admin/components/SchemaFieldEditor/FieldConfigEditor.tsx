import { useTranslation } from 'react-i18next';
import { Trash2, Plus } from 'lucide-react';
import type { SchemaField, SchemaFieldConfig } from './types';
import { SMALL_INPUT_CLASS } from './constants';
export function FieldConfigEditor({
  field,
  onConfigChange,
}: {
  field: SchemaField;
  onConfigChange: (config: SchemaFieldConfig) => void;
}) {
  const { t } = useTranslation('admin');
  const config = field.config;

  const updateConfig = (partial: Partial<SchemaFieldConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldPlaceholder')}
            </label>
            <input
              type="text"
              value={config.placeholder || ''}
              onChange={(e) => updateConfig({ placeholder: e.target.value })}
              className={SMALL_INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldMaxLength')}
            </label>
            <input
              type="number"
              value={config.maxLength ?? ''}
              onChange={(e) =>
                updateConfig({
                  maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className={SMALL_INPUT_CLASS}
              min={0}
            />
          </div>
        </div>
      );

    case 'number':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldMin')}
            </label>
            <input
              type="number"
              value={config.min ?? ''}
              onChange={(e) =>
                updateConfig({
                  min: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className={SMALL_INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldMax')}
            </label>
            <input
              type="number"
              value={config.max ?? ''}
              onChange={(e) =>
                updateConfig({
                  max: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className={SMALL_INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldUnit')}
            </label>
            <input
              type="text"
              value={config.unit || ''}
              onChange={(e) => updateConfig({ unit: e.target.value })}
              className={SMALL_INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldPlaceholder')}
            </label>
            <input
              type="text"
              value={config.placeholder || ''}
              onChange={(e) => updateConfig({ placeholder: e.target.value })}
              className={SMALL_INPUT_CLASS}
            />
          </div>
        </div>
      );

    case 'date':
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          {t('templates.noConfig')}
        </p>
      );

    case 'select': {
      const options = config.options || [];
      return (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('templates.fieldOptions')}
          </label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder={t('templates.optionValue')}
                value={opt.value}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[idx] = { ...newOpts[idx], value: e.target.value };
                  updateConfig({ options: newOpts });
                }}
                className={SMALL_INPUT_CLASS}
              />
              <input
                type="text"
                placeholder={t('templates.optionLabel')}
                value={opt.label}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                  updateConfig({ options: newOpts });
                }}
                className={SMALL_INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => {
                  const newOpts = options.filter((_, i) => i !== idx);
                  updateConfig({ options: newOpts });
                }}
                className="shrink-0 p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title={t('templates.removeOption')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateConfig({ options: [...options, { value: '', label: '' }] })
            }
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('templates.addOption')}
          </button>
        </div>
      );
    }

    case 'staticText':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('templates.fieldContent')}
          </label>
          <textarea
            rows={3}
            value={config.content || ''}
            onChange={(e) => updateConfig({ content: e.target.value })}
            className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors resize-none border-gray-300 dark:border-gray-600`}
          />
        </div>
      );

    case 'hidden':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('templates.fieldDefaultValue')}
          </label>
          <input
            type="text"
            value={config.defaultValue || ''}
            onChange={(e) => updateConfig({ defaultValue: e.target.value })}
            className={SMALL_INPUT_CLASS}
          />
        </div>
      );

    default:
      return null;
  }
}
