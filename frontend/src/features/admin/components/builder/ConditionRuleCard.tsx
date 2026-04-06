import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConditionalRuleCondition } from '../../../document/types/dynamicForm';

interface ConditionRuleCardProps {
  condition: ConditionalRuleCondition;
  availableFields: { id: string; label: string }[];
  onChange: (updated: ConditionalRuleCondition) => void;
  onRemove: () => void;
}

export default function ConditionRuleCard({
  condition,
  availableFields,
  onChange,
  onRemove,
}: ConditionRuleCardProps) {
  const { t } = useTranslation('admin');

  const hideValue =
    condition.operator === 'is_empty' || condition.operator === 'is_not_empty';

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Source field dropdown */}
      <select
        className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        value={condition.sourceFieldId}
        onChange={(e) =>
          onChange({ ...condition, sourceFieldId: e.target.value })
        }
      >
        <option value="">
          {t('templates.conditionSourcePlaceholder', '소스 필드 선택')}
        </option>
        {availableFields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Operator dropdown */}
      <select
        className="w-32 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        value={condition.operator}
        onChange={(e) =>
          onChange({
            ...condition,
            operator: e.target.value as ConditionalRuleCondition['operator'],
          })
        }
      >
        <option value="equals">
          {t('templates.conditionOperatorEquals', '같음')}
        </option>
        <option value="not_equals">
          {t('templates.conditionOperatorNotEquals', '같지 않음')}
        </option>
        <option value="is_empty">
          {t('templates.conditionOperatorIsEmpty', '비어있음')}
        </option>
        <option value="is_not_empty">
          {t('templates.conditionOperatorIsNotEmpty', '비어있지 않음')}
        </option>
      </select>

      {/* Value input - hidden when operator is is_empty or is_not_empty */}
      {!hideValue && (
        <input
          type="text"
          className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          placeholder={t('templates.conditionValuePlaceholder', '값 입력')}
          value={condition.value ?? ''}
          onChange={(e) =>
            onChange({ ...condition, value: e.target.value })
          }
        />
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-gray-400 hover:text-red-500"
        aria-label={t('templates.conditionDeleteLabel', '조건 삭제')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
