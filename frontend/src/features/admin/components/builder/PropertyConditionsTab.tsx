import { Plus, Trash2 } from 'lucide-react';
import type {
  FieldDefinition,
  ConditionRule,
  CalculationConfig,
  CalculationOperation,
} from '../../../document/types/dynamicForm';
import ConditionRuleCard from './ConditionRuleCard';

interface PropertyConditionsTabProps {
  field: FieldDefinition;
  allFields: FieldDefinition[];
  onUpdate: (updates: Partial<FieldDefinition>) => void;
}

const CALC_OPERATIONS: { value: CalculationOperation; label: string }[] = [
  { value: 'SUM', label: '합계 (SUM)' },
  { value: 'MULTIPLY', label: '곱하기 (MULTIPLY)' },
  { value: 'ADD', label: '더하기 (ADD)' },
  { value: 'COUNT', label: '개수 (COUNT)' },
];

export default function PropertyConditionsTab({
  field,
  allFields,
  onUpdate,
}: PropertyConditionsTabProps) {
  const conditions = field.conditions ?? [];
  const otherFields = allFields.filter((f) => f.id !== field.id);
  const numberFields = otherFields.filter((f) => f.type === 'number');

  // --- Condition rules ---

  function handleAddRule() {
    const sourceFieldId = otherFields.length > 0 ? otherFields[0].id : '';
    const newRule: ConditionRule = {
      action: 'show',
      sourceFieldId,
      operator: 'equals',
      value: '',
    };
    onUpdate({ conditions: [...conditions, newRule] });
  }

  function handleUpdateRule(index: number, rule: ConditionRule) {
    const next = conditions.map((r, i) => (i === index ? rule : r));
    onUpdate({ conditions: next });
  }

  function handleRemoveRule(index: number) {
    onUpdate({ conditions: conditions.filter((_, i) => i !== index) });
  }

  // --- Calculation config (number fields only) ---

  function handleSetCalc(calc: CalculationConfig | undefined) {
    onUpdate({ calculation: calc });
  }

  return (
    <div className="space-y-6">
      {/* Condition rules section */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
          조건부 표시/숨김 규칙
        </h4>

        {conditions.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            이 필드에 대한 조건 규칙이 없습니다.
          </p>
        )}

        <div className="space-y-3">
          {conditions.map((rule, index) => (
            <ConditionRuleCard
              key={index}
              rule={rule}
              sourceFields={otherFields}
              onChange={(updated) => handleUpdateRule(index, updated)}
              onRemove={() => handleRemoveRule(index)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddRule}
          disabled={otherFields.length === 0}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed mt-3"
        >
          <Plus className="w-4 h-4" />
          조건 추가
        </button>

        {otherFields.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">
            조건을 추가하려면 다른 필드가 필요합니다.
          </p>
        )}
      </div>

      {/* Calculation config (number fields only) */}
      {field.type === 'number' && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
            계산 규칙
          </h4>

          {!field.calculation ? (
            <>
              <p className="text-xs text-gray-400 mb-2">
                이 필드의 값을 다른 숫자 필드로부터 자동 계산합니다.
              </p>
              <button
                type="button"
                onClick={() =>
                  handleSetCalc({
                    operation: 'SUM',
                    sourceFields: [],
                  })
                }
                disabled={numberFields.length === 0}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                계산 규칙 추가
              </button>
              {numberFields.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  다른 숫자 필드가 없습니다.
                </p>
              )}
            </>
          ) : (
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  자동 계산
                </span>
                <button
                  type="button"
                  onClick={() => handleSetCalc(undefined)}
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                  title="계산 규칙 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Operation */}
              <select
                value={field.calculation.operation}
                onChange={(e) =>
                  handleSetCalc({
                    ...field.calculation!,
                    operation: e.target.value as CalculationOperation,
                  })
                }
                className="w-full h-8 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
              >
                {CALC_OPERATIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Source fields */}
              <div className="space-y-1">
                <span className="text-xs text-gray-500">소스 필드:</span>
                {numberFields.map((nf) => (
                  <label
                    key={nf.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={field.calculation!.sourceFields.includes(nf.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...field.calculation!.sourceFields, nf.id]
                          : field.calculation!.sourceFields.filter(
                              (id) => id !== nf.id,
                            );
                        handleSetCalc({
                          ...field.calculation!,
                          sourceFields: next,
                        });
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {nf.label}
                    </span>
                  </label>
                ))}
                {numberFields.length === 0 && (
                  <p className="text-xs text-gray-400">
                    다른 숫자 필드가 없습니다.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
