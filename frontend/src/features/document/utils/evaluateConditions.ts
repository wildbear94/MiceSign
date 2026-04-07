import type {
  ConditionOperator,
  ConditionalRule,
  ConditionalRuleCondition,
  FieldDefinition,
} from '../types/dynamicForm';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FieldVisibility {
  visible: boolean;
  conditionallyRequired: boolean;
}

// ---------------------------------------------------------------------------
// Operator evaluation
// ---------------------------------------------------------------------------

function evaluateOperator(
  source: unknown,
  operator: ConditionOperator,
  value: unknown,
): boolean {
  switch (operator) {
    case 'equals':
      return String(source ?? '') === String(value ?? '');

    case 'not_equals':
    case 'notEquals':
      return String(source ?? '') !== String(value ?? '');

    case 'contains':
      return String(source ?? '').includes(String(value ?? ''));

    case 'greaterThan':
      return Number(source) > Number(value);

    case 'lessThan':
      return Number(source) < Number(value);

    case 'isEmpty':
    case 'is_empty':
      return source === undefined || source === null || source === '';

    case 'isNotEmpty':
    case 'is_not_empty':
      return source !== undefined && source !== null && source !== '';

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Evaluate a single condition
// ---------------------------------------------------------------------------

function evaluateCondition(
  condition: ConditionalRuleCondition,
  formValues: Record<string, unknown>,
): boolean {
  const value = formValues[condition.sourceFieldId];
  return evaluateOperator(value, condition.operator, condition.value);
}

// ---------------------------------------------------------------------------
// Evaluate multiple conditions with matchType (all / any)
// ---------------------------------------------------------------------------

function evaluateConditionGroup(
  conditions: ConditionalRuleCondition[],
  formValues: Record<string, unknown>,
  matchType: 'all' | 'any',
): boolean {
  if (conditions.length === 0) return false;

  if (matchType === 'all') {
    return conditions.every((c) => evaluateCondition(c, formValues));
  }
  return conditions.some((c) => evaluateCondition(c, formValues));
}

// ---------------------------------------------------------------------------
// Flatten nested sections
// ---------------------------------------------------------------------------

function flattenFields(fields: FieldDefinition[]): FieldDefinition[] {
  const result: FieldDefinition[] = [];
  for (const field of fields) {
    result.push(field);
    if (field.type === 'section' && field.children) {
      result.push(...flattenFields(field.children));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate all conditional rules and produce a visibility / required map
 * keyed by field ID.
 *
 * @param rules      - Top-level ConditionalRule[] from the schema definition
 * @param formValues - Current form data
 * @param fieldMeta  - Metadata for each field (id + base required flag)
 */
export function evaluateAllConditions(
  rules: ConditionalRule[],
  formValues: Record<string, unknown>,
  fieldMeta: { id: string; required: boolean }[],
): Map<string, FieldVisibility> {
  const result = new Map<string, FieldVisibility>();

  // Initialize every field as visible, not conditionally required
  for (const meta of fieldMeta) {
    result.set(meta.id, { visible: true, conditionallyRequired: false });
  }

  // Apply each rule
  for (const rule of rules) {
    const matched = evaluateConditionGroup(
      rule.conditions,
      formValues,
      rule.matchType,
    );

    const current = result.get(rule.targetFieldId) ?? {
      visible: true,
      conditionallyRequired: false,
    };

    switch (rule.action) {
      case 'show':
        current.visible = matched;
        break;
      case 'hide':
        current.visible = !matched;
        break;
      case 'require':
        if (matched) {
          current.conditionallyRequired = true;
        }
        break;
    }

    result.set(rule.targetFieldId, current);
  }

  return result;
}

/**
 * Evaluate inline per-field conditions (ConditionRule[]) from
 * FieldDefinition.conditions and return a visibility map.
 *
 * This is a convenience wrapper for schemas that use inline conditions
 * rather than top-level ConditionalRule[].
 */
export function evaluateInlineConditions(
  fields: FieldDefinition[],
  formData: Record<string, unknown>,
): Map<string, FieldVisibility> {
  const result = new Map<string, FieldVisibility>();

  for (const field of flattenFields(fields)) {
    let visible = true;
    let dynamicRequired = false;

    if (field.conditions && field.conditions.length > 0) {
      for (const rule of field.conditions) {
        const sourceValue = formData[rule.sourceFieldId];
        const matches = evaluateOperator(sourceValue, rule.operator, rule.value);

        switch (rule.action) {
          case 'show':
            visible = matches;
            break;
          case 'hide':
            visible = !matches;
            break;
          case 'require':
            dynamicRequired = matches;
            break;
        }
      }
    }

    result.set(field.id, {
      visible,
      conditionallyRequired: (field.required || dynamicRequired) && visible
        ? dynamicRequired
        : false,
    });
  }

  return result;
}

// Re-export under alias for backward compatibility
export { evaluateAllConditions as evaluateConditionsMap };
