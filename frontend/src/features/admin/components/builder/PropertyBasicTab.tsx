import { useTranslation } from 'react-i18next';
import type { FieldDefinition, FieldConfig } from '../../types/builder';

interface PropertyBasicTabProps {
  field: FieldDefinition;
  onUpdateField: (fieldId: string, changes: Partial<FieldDefinition>) => void;
  onUpdateFieldConfig: (fieldId: string, config: Partial<FieldConfig>) => void;
}

export default function PropertyBasicTab({
  field,
  onUpdateField,
  onUpdateFieldConfig,
}: PropertyBasicTabProps) {
  const { t } = useTranslation('admin');

  const showPlaceholder = ['text', 'textarea', 'number'].includes(field.type);
  const showRequired = !['staticText'].includes(field.type);
  const showLabel = field.type !== 'staticText';
  const showContent = field.type === 'staticText';
  const showDefaultValue = field.type === 'hidden';

  return (
    <div className="space-y-4">
      {showLabel && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('templates.fieldLabel', '라벨')}
          </label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
      )}

      {showRequired && (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) =>
                onUpdateField(field.id, { required: e.target.checked })
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('templates.fieldRequired', '필수 입력')}
            </span>
          </label>
        </div>
      )}

      {showPlaceholder && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('templates.fieldPlaceholder', '플레이스홀더')}
          </label>
          <input
            type="text"
            value={field.config?.placeholder ?? ''}
            onChange={(e) =>
              onUpdateFieldConfig(field.id, { placeholder: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
      )}

      {showContent && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('templates.fieldContent', '안내 내용')}
          </label>
          <textarea
            value={field.config?.content ?? ''}
            onChange={(e) =>
              onUpdateFieldConfig(field.id, { content: e.target.value })
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-y"
          />
        </div>
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
    </div>
  );
}
