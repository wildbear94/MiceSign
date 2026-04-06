import { useTranslation } from 'react-i18next';
import type { FieldDefinition, BuilderAction } from '../../types/builder';
import type {
  ConditionalRule,
  ConditionalRuleCondition,
} from '../../../document/types/dynamicForm';
import ConditionRuleCard from './ConditionRuleCard';

interface PropertyConditionsTabProps {
  field: FieldDefinition;
  allFields: FieldDefinition[];
  conditionalRules: ConditionalRule[];
  onDispatch: (action: BuilderAction) => void;
}

export default function PropertyConditionsTab({
  field,
  allFields,
  conditionalRules,
  onDispatch,
}: PropertyConditionsTabProps) {
  const { t } = useTranslation('admin');

  // Available source fields: exclude current field and section-type fields
  const availableFields = allFields
    .filter((f) => f.id !== field.id && f.type !== 'section')
    .map((f) => ({ id: f.id, label: f.label }));

  // Find the rule index for this field
  const ruleIndex = conditionalRules.findIndex(
    (r) => r.targetFieldId === field.id,
  );
  const existingRule: ConditionalRule | null =
    ruleIndex >= 0 ? conditionalRules[ruleIndex] : null;

  // Helper to update or create rule
  const updateRule = (partial: Partial<ConditionalRule>) => {
    if (existingRule && ruleIndex >= 0) {
      onDispatch({
        type: 'UPDATE_CONDITIONAL_RULE',
        index: ruleIndex,
        rule: { ...existingRule, ...partial },
      });
    }
  };

  const ensureRuleExists = (): ConditionalRule => {
    if (existingRule) return existingRule;
    const newRule: ConditionalRule = {
      targetFieldId: field.id,
      action: 'show',
      matchType: 'all',
      conditions: [],
    };
    onDispatch({ type: 'ADD_CONDITIONAL_RULE', rule: newRule });
    return newRule;
  };

  const handleAddCondition = () => {
    const rule = ensureRuleExists();
    const newCondition: ConditionalRuleCondition = {
      sourceFieldId: '',
      operator: 'equals',
      value: '',
    };
    if (!existingRule) {
      // Rule was just dispatched as ADD; we need to update via the current dispatch
      // Since ADD already ran, rule is now at the end; update it
      // But the add already happened with empty conditions, so we need to update
      const updatedRule: ConditionalRule = {
        ...rule,
        conditions: [...rule.conditions, newCondition],
      };
      // For newly added rule, we need to find its index after add
      // Since add pushes to end, use current length
      onDispatch({
        type: 'UPDATE_CONDITIONAL_RULE',
        index: conditionalRules.length, // will be the last one after ADD
        rule: updatedRule,
      });
    } else {
      updateRule({
        conditions: [...existingRule.conditions, newCondition],
      });
    }
  };

  const handleConditionChange = (
    condIndex: number,
    updated: ConditionalRuleCondition,
  ) => {
    if (!existingRule) return;
    const newConditions = [...existingRule.conditions];
    newConditions[condIndex] = updated;
    updateRule({ conditions: newConditions });
  };

  const handleConditionRemove = (condIndex: number) => {
    if (!existingRule) return;
    const newConditions = existingRule.conditions.filter(
      (_, i) => i !== condIndex,
    );
    if (newConditions.length === 0) {
      // Remove the entire rule when no conditions remain
      onDispatch({ type: 'REMOVE_CONDITIONAL_RULE', index: ruleIndex });
    } else {
      updateRule({ conditions: newConditions });
    }
  };

  const handleMatchTypeChange = (matchType: 'all' | 'any') => {
    if (!existingRule) return;
    updateRule({ matchType });
  };

  const handleActionChange = (action: 'show' | 'hide' | 'require') => {
    if (!existingRule) return;
    updateRule({ action });
  };

  // Empty state
  if (!existingRule || existingRule.conditions.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t(
            'templates.conditionEmptyState',
            '"조건 추가"를 클릭하여 규칙을 설정하세요.',
          )}
        </p>
        <button
          type="button"
          onClick={handleAddCondition}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {t('templates.conditionAddButton', '+ 조건 추가')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Match type selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('templates.conditionMatchType', '일치 조건')}
        </label>
        <select
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          value={existingRule.matchType}
          onChange={(e) =>
            handleMatchTypeChange(e.target.value as 'all' | 'any')
          }
        >
          <option value="all">
            {t('templates.conditionMatchAll', '모두 충족 (AND)')}
          </option>
          <option value="any">
            {t('templates.conditionMatchAny', '하나 이상 충족 (OR)')}
          </option>
        </select>
      </div>

      {/* Condition cards */}
      <div className="space-y-2">
        {existingRule.conditions.map((cond, idx) => (
          <ConditionRuleCard
            key={idx}
            condition={cond}
            availableFields={availableFields}
            onChange={(updated) => handleConditionChange(idx, updated)}
            onRemove={() => handleConditionRemove(idx)}
          />
        ))}
      </div>

      {/* Add condition button */}
      <button
        type="button"
        onClick={handleAddCondition}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        {t('templates.conditionAddButton', '+ 조건 추가')}
      </button>

      {/* Action selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('templates.conditionAction', '실행 액션')}
        </label>
        <select
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          value={existingRule.action}
          onChange={(e) =>
            handleActionChange(e.target.value as 'show' | 'hide' | 'require')
          }
        >
          <option value="show">
            {t('templates.conditionActionShow', '표시')}
          </option>
          <option value="hide">
            {t('templates.conditionActionHide', '숨기기')}
          </option>
          <option value="require">
            {t('templates.conditionActionRequire', '필수')}
          </option>
        </select>
      </div>
    </div>
  );
}
