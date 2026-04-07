import { X } from 'lucide-react';
import type {
  ConditionRule,
  ConditionOperator,
  FieldDefinition,
} from '../../../document/types/dynamicForm';

interface ConditionRuleCardProps {
  rule: ConditionRule;
  sourceFields: FieldDefinition[];
  onChange: (rule: ConditionRule) => void;
  onRemove: () => void;
}

const ACTION_OPTIONS: { value: ConditionRule['action']; label: string }[] = [
  { value: 'show', label: '표시' },
  { value: 'hide', label: '숨기기' },
  { value: 'require', label: '필수 처리' },
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: '같음' },
  { value: 'not_equals', label: '같지 않음' },
  { value: 'contains', label: '포함' },
  { value: 'greaterThan', label: '초과' },
  { value: 'lessThan', label: '미만' },
  { value: 'is_empty', label: '비어있음' },
  { value: 'is_not_empty', label: '비어있지 않음' },
];

export default function ConditionRuleCard({
  rule,
  sourceFields,
  onChange,
  onRemove,
}: ConditionRuleCardProps) {
  const needsValue =
    rule.operator !== 'is_empty' &&
    rule.operator !== 'is_not_empty' &&
    rule.operator !== 'isEmpty' &&
    rule.operator !== 'isNotEmpty';

  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          조건 규칙
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
          title="규칙 삭제"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">동작</label>
        <select
          value={rule.action}
          onChange={(e) =>
            onChange({ ...rule, action: e.target.value as ConditionRule['action'] })
          }
          className="w-full h-8 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Source field */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">
          소스 필드
        </label>
        <select
          value={rule.sourceFieldId}
          onChange={(e) =>
            onChange({ ...rule, sourceFieldId: e.target.value })
          }
          className="w-full h-8 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
        >
          <option value="">필드 선택</option>
          {sourceFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Operator */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">
          연산자
        </label>
        <select
          value={rule.operator}
          onChange={(e) =>
            onChange({ ...rule, operator: e.target.value as ConditionOperator })
          }
          className="w-full h-8 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
        >
          {OPERATOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value */}
      {needsValue && (
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">값</label>
          <input
            type="text"
            value={String(rule.value ?? '')}
            onChange={(e) => onChange({ ...rule, value: e.target.value })}
            placeholder="비교 값"
            className="w-full h-8 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
          />
        </div>
      )}
    </div>
  );
}
