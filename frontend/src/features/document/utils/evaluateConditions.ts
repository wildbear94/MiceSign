import type { ConditionalRule } from '../types/dynamicForm';

export interface ConditionResult {
  hiddenFields: Set<string>;
  requiredFields: Set<string>;
}

type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';

/**
 * Evaluates a single condition operator against a field value.
 */
function evaluateOperator(
  fieldValue: unknown,
  operator: ComparisonOperator,
  conditionValue: unknown,
): boolean {
  switch (operator) {
    case 'isEmpty':
      return fieldValue == null || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);

    case 'isNotEmpty':
      return fieldValue != null && fieldValue !== '' && !(Array.isArray(fieldValue) && fieldValue.length === 0);

    case 'eq':
      // Loose equality to handle string/number comparisons (e.g., "3" == 3)
      // eslint-disable-next-line eqeqeq
      return fieldValue == conditionValue;

    case 'neq':
      // eslint-disable-next-line eqeqeq
      return fieldValue != conditionValue;

    case 'gt':
      return Number(fieldValue) > Number(conditionValue);

    case 'gte':
      return Number(fieldValue) >= Number(conditionValue);

    case 'lt':
      return Number(fieldValue) < Number(conditionValue);

    case 'lte':
      return Number(fieldValue) <= Number(conditionValue);

    case 'in': {
      const allowedValues = Array.isArray(conditionValue) ? conditionValue : [];
      // eslint-disable-next-line eqeqeq
      return allowedValues.some((v) => v == fieldValue);
    }

    case 'notIn': {
      const disallowedValues = Array.isArray(conditionValue) ? conditionValue : [];
      // eslint-disable-next-line eqeqeq
      return !disallowedValues.some((v) => v == fieldValue);
    }

    default:
      return false;
  }
}

/**
 * Evaluates all conditional rules against current form values.
 *
 * For each rule:
 * - Evaluate `condition` against `formValues[condition.fieldId]`
 * - If condition is met, apply the `action` to `targetFieldId`
 *
 * Actions:
 * - `show`       -> remove from hiddenFields (no-op if not hidden)
 * - `hide`       -> add to hiddenFields
 * - `require`    -> add to requiredFields
 * - `unrequire`  -> remove from requiredFields (no-op if not required)
 *
 * @returns Sets of hidden and dynamically-required field IDs
 */
export function evaluateConditions(
  rules: ConditionalRule[],
  formValues: Record<string, unknown>,
): ConditionResult {
  const hiddenFields = new Set<string>();
  const requiredFields = new Set<string>();

  for (const rule of rules) {
    const { targetFieldId, condition, action } = rule;
    const fieldValue = formValues[condition.fieldId];
    const operator = condition.operator as ComparisonOperator;
    const conditionMet = evaluateOperator(fieldValue, operator, condition.value);

    if (conditionMet) {
      switch (action) {
        case 'hide':
          hiddenFields.add(targetFieldId);
          break;
        case 'show':
          hiddenFields.delete(targetFieldId);
          break;
        case 'require':
          requiredFields.add(targetFieldId);
          break;
        case 'unrequire':
          requiredFields.delete(targetFieldId);
          break;
      }
    }
  }

  return { hiddenFields, requiredFields };
}
