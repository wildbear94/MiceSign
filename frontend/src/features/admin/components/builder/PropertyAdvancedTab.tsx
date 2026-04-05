import { useTranslation } from 'react-i18next';
import type { FieldDefinition, FieldConfig } from '../../types/builder';

interface PropertyAdvancedTabProps {
  field: FieldDefinition;
  onUpdateFieldConfig: (fieldId: string, config: Partial<FieldConfig>) => void;
}

export default function PropertyAdvancedTab({
  field,
  onUpdateFieldConfig,
}: PropertyAdvancedTabProps) {
  const { t } = useTranslation('admin');

  const showWidth = !['staticText', 'hidden'].includes(field.type);
  const showDefaultValue = ['text', 'number'].includes(field.type);

  return (
    <div className="space-y-4">
      {showWidth && (
        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('templates.fieldWidth', '너비')}
          </legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`width-${field.id}`}
                checked={(field.config?.width ?? 'full') === 'full'}
                onChange={() =>
                  onUpdateFieldConfig(field.id, { width: 'full' })
                }
                className="text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('templates.fieldWidthFull', '전체 너비')}
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`width-${field.id}`}
                checked={field.config?.width === 'half'}
                onChange={() =>
                  onUpdateFieldConfig(field.id, { width: 'half' })
                }
                className="text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('templates.fieldWidthHalf', '절반 너비')}
              </span>
            </label>
          </div>
        </fieldset>
      )}

      {showDefaultValue && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('templates.fieldDefaultValue', '기본값')}
          </label>
          <input
            type="text"
            value={field.config?.defaultValue ?? ''}
            onChange={(e) =>
              onUpdateFieldConfig(field.id, { defaultValue: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('templates.fieldId', '필드 ID')}
        </label>
        <div className="text-sm text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
          {field.id}
        </div>
      </div>
    </div>
  );
}
