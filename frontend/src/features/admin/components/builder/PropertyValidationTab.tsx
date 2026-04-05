import { useTranslation } from 'react-i18next';
import type { FieldDefinition, FieldConfig } from '../../types/builder';

interface PropertyValidationTabProps {
  field: FieldDefinition;
  onUpdateFieldConfig: (fieldId: string, config: Partial<FieldConfig>) => void;
}

const TYPES_WITH_NO_VALIDATION = ['date', 'select', 'staticText', 'hidden'];

export default function PropertyValidationTab({
  field,
  onUpdateFieldConfig,
}: PropertyValidationTabProps) {
  const { t } = useTranslation('admin');

  if (TYPES_WITH_NO_VALIDATION.includes(field.type)) {
    return (
      <p className="text-sm text-gray-400">
        {t(
          'templates.noValidationOptions',
          '이 필드 타입에는 검증 옵션이 없습니다',
        )}
      </p>
    );
  }

  const showMaxLength = ['text', 'textarea'].includes(field.type);
  const showMinMax = field.type === 'number';
  const showUnit = field.type === 'number';
  const showMinMaxRows = field.type === 'table';

  return (
    <div className="space-y-4">
      {showMaxLength && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('templates.maxLength', '최대 길이')}
          </label>
          <input
            type="number"
            value={field.config?.maxLength ?? ''}
            onChange={(e) =>
              onUpdateFieldConfig(field.id, {
                maxLength: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            min={0}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
      )}

      {showMinMax && (
        <>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('templates.minValue', '최소값')}
            </label>
            <input
              type="number"
              value={field.config?.min ?? ''}
              onChange={(e) =>
                onUpdateFieldConfig(field.id, {
                  min: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('templates.maxValue', '최대값')}
            </label>
            <input
              type="number"
              value={field.config?.max ?? ''}
              onChange={(e) =>
                onUpdateFieldConfig(field.id, {
                  max: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        </>
      )}

      {showUnit && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('templates.unit', '단위')}
          </label>
          <input
            type="text"
            value={field.config?.unit ?? ''}
            onChange={(e) =>
              onUpdateFieldConfig(field.id, { unit: e.target.value })
            }
            placeholder={t('templates.unitPlaceholder', '예: 원, 개, kg')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
      )}

      {showMinMaxRows && (
        <>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('templates.minRows', '최소 행 수')}
            </label>
            <input
              type="number"
              value={field.config?.minRows ?? ''}
              onChange={(e) =>
                onUpdateFieldConfig(field.id, {
                  minRows: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              min={0}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('templates.maxRows', '최대 행 수')}
            </label>
            <input
              type="number"
              value={field.config?.maxRows ?? ''}
              onChange={(e) =>
                onUpdateFieldConfig(field.id, {
                  maxRows: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              min={0}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        </>
      )}
    </div>
  );
}
