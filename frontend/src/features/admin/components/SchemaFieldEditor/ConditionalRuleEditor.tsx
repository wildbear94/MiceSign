import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ConditionalRule } from '../../../document/types/dynamicForm';
import type { SchemaField } from './types';
import { SMALL_INPUT_CLASS, OPERATORS_BY_TYPE, ACTION_OPTIONS } from './constants';
import { getAvailableSourceFields } from './conditionalRuleUtils';

interface ConditionalRuleEditorProps {
  targetFieldId: string;
  rule: ConditionalRule | undefined; // D-02: one rule per field
  allFields: SchemaField[];
  allRules: ConditionalRule[];
  onAddRule: (rule: ConditionalRule) => void;
  onUpdateRule: (rule: ConditionalRule) => void;
  onDeleteRule: () => void;
}

export function ConditionalRuleEditor({
  targetFieldId,
  rule,
  allFields,
  allRules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}: ConditionalRuleEditorProps) {
  const { t } = useTranslation('admin');

  const handleAdd = () => {
    const available = getAvailableSourceFields(targetFieldId, allFields, allRules);
    if (available.length === 0) {
      toast(t('templates.condition.noSourceFields'));
      return;
    }
    const firstSource = available[0];
    const operators = OPERATORS_BY_TYPE[firstSource.type] || [];
    onAddRule({
      targetFieldId,
      condition: {
        fieldId: firstSource.id,
        operator: operators[0] || 'eq',
        value: '',
      },
      action: 'show',
    });
  };

  if (!rule) {
    // D-03: empty state
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500">
        <p>{t('templates.condition.noRule')}</p>
        <button
          type="button"
          onClick={handleAdd}
          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('templates.condition.addRule')}
        </button>
      </div>
    );
  }

  // Find the source field for type-specific rendering
  const sourceField = allFields.find(f => f.id === rule.condition.fieldId);
  const sourceType = sourceField?.type || 'text';
  const operators = OPERATORS_BY_TYPE[sourceType] || [];
  const availableSources = getAvailableSourceFields(targetFieldId, allFields, allRules);
  // Include current source even if it would be filtered (for stable display)
  const sourceOptions = sourceField && !availableSources.find(f => f.id === sourceField.id)
    ? [sourceField, ...availableSources]
    : availableSources;

  const isUnaryOperator = rule.condition.operator === 'isEmpty' || rule.condition.operator === 'isNotEmpty';
  const isMultiValueOperator = rule.condition.operator === 'in' || rule.condition.operator === 'notIn';

  const handleSourceChange = (newFieldId: string) => {
    const newSource = allFields.find(f => f.id === newFieldId);
    const newType = newSource?.type || 'text';
    const newOperators = OPERATORS_BY_TYPE[newType] || [];
    onUpdateRule({
      ...rule,
      condition: {
        fieldId: newFieldId,
        operator: newOperators[0] || 'eq',
        value: '',
      },
    });
  };

  const handleOperatorChange = (newOperator: string) => {
    const newIsUnary = newOperator === 'isEmpty' || newOperator === 'isNotEmpty';
    onUpdateRule({
      ...rule,
      condition: {
        ...rule.condition,
        operator: newOperator,
        value: newIsUnary ? null : '',
      },
    });
  };

  const handleValueChange = (newValue: unknown) => {
    onUpdateRule({
      ...rule,
      condition: {
        ...rule.condition,
        value: newValue,
      },
    });
  };

  const handleActionChange = (newAction: string) => {
    onUpdateRule({
      ...rule,
      action: newAction as ConditionalRule['action'],
    });
  };

  // D-11: Toggle checkbox value in array for in/notIn operators
  const handleCheckboxToggle = (optionValue: string) => {
    const currentValues = Array.isArray(rule.condition.value) ? rule.condition.value as string[] : [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue];
    handleValueChange(newValues);
  };

  // Render value input based on source type and operator
  const renderValueInput = () => {
    if (isUnaryOperator) return null;

    const sourceOptions_ = sourceField?.config?.options || [];

    // D-11: Checkbox list for in/notIn with select source
    if (sourceType === 'select' && isMultiValueOperator) {
      const selectedValues = Array.isArray(rule.condition.value) ? rule.condition.value as string[] : [];
      return (
        <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-1">
          {sourceOptions_.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedValues.includes(opt.value)}
                onChange={() => handleCheckboxToggle(opt.value)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">{opt.label || opt.value}</span>
            </label>
          ))}
        </div>
      );
    }

    // D-10: Select dropdown for eq/neq with select source
    if (sourceType === 'select') {
      return (
        <select
          value={(rule.condition.value as string) || ''}
          onChange={(e) => handleValueChange(e.target.value)}
          className={SMALL_INPUT_CLASS}
        >
          <option value="">{t('templates.condition.enterValue')}</option>
          {sourceOptions_.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label || opt.value}
            </option>
          ))}
        </select>
      );
    }

    // Number input
    if (sourceType === 'number') {
      return (
        <input
          type="number"
          value={(rule.condition.value as string) ?? ''}
          onChange={(e) => handleValueChange(e.target.value)}
          className={SMALL_INPUT_CLASS}
          placeholder={t('templates.condition.enterValue')}
        />
      );
    }

    // Date input
    if (sourceType === 'date') {
      return (
        <input
          type="date"
          value={(rule.condition.value as string) || ''}
          onChange={(e) => handleValueChange(e.target.value)}
          className={SMALL_INPUT_CLASS}
        />
      );
    }

    // Default: text input
    return (
      <input
        type="text"
        value={(rule.condition.value as string) || ''}
        onChange={(e) => handleValueChange(e.target.value)}
        className={SMALL_INPUT_CLASS}
        placeholder={t('templates.condition.enterValue')}
      />
    );
  };

  return (
    <div className="space-y-2">
      {/* Row 1: IF + source field + operator/value */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('templates.condition.if')}
        </span>
        {/* Source field dropdown - full width */}
        <select
          value={rule.condition.fieldId}
          onChange={(e) => handleSourceChange(e.target.value)}
          className={SMALL_INPUT_CLASS}
        >
          {sourceOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label || f.id}
            </option>
          ))}
        </select>
        {/* Operator + value - grid-cols-2 */}
        <div className={`grid ${isUnaryOperator ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
          <select
            value={rule.condition.operator}
            onChange={(e) => handleOperatorChange(e.target.value)}
            className={SMALL_INPUT_CLASS}
          >
            {operators.map((op) => (
              <option key={op} value={op}>
                {t(`templates.condition.operators.${op}`)}
              </option>
            ))}
          </select>
          {renderValueInput()}
        </div>
      </div>

      {/* Row 2: THEN + action + delete */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('templates.condition.then')}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={rule.action}
            onChange={(e) => handleActionChange(e.target.value)}
            className={SMALL_INPUT_CLASS}
          >
            {ACTION_OPTIONS.map((action) => (
              <option key={action.value} value={action.value}>
                {t(action.labelKey)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onDeleteRule}
            className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title={t('templates.condition.deleteRule')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
