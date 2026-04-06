import type { ConditionalRule, ConditionalRuleCondition } from '../types/dynamicForm';

/**
 * 필드 가시성 상태
 */
export interface FieldVisibility {
  visible: boolean;
  conditionallyRequired: boolean;
}

/**
 * 단일 조건 평가
 */
function evaluateCondition(
  condition: ConditionalRuleCondition,
  formValues: Record<string, unknown>,
): boolean {
  const val = formValues[condition.sourceFieldId];
  const strVal = String(val ?? '');

  switch (condition.operator) {
    case 'equals':
      return strVal === (condition.value ?? '');
    case 'not_equals':
      return strVal !== (condition.value ?? '');
    case 'is_empty':
      return val == null || strVal === '';
    case 'is_not_empty':
      return val != null && strVal !== '';
    default:
      return false;
  }
}

/**
 * 조건부 규칙을 평가하여 각 필드의 가시성과 조건부 필수 상태를 계산
 *
 * - show 액션: 조건 충족 시 표시, 미충족 시 숨김
 * - hide 액션: 조건 충족 시 숨김, 미충족 시 표시
 * - require 액션: 조건 충족 시 conditionallyRequired=true (가시성 불변)
 * - matchType all: 모든 조건이 참이어야 함
 * - matchType any: 하나 이상의 조건이 참이면 됨
 */
export function evaluateConditions(
  rules: ConditionalRule[],
  formValues: Record<string, unknown>,
  fields: { id: string; required: boolean }[],
): Map<string, FieldVisibility> {
  const result = new Map<string, FieldVisibility>();

  // 모든 필드를 기본값으로 초기화
  for (const field of fields) {
    result.set(field.id, { visible: true, conditionallyRequired: false });
  }

  // 각 규칙 평가
  for (const rule of rules) {
    const conditionResults = rule.conditions.map((c) =>
      evaluateCondition(c, formValues),
    );

    const matched =
      rule.matchType === 'all'
        ? conditionResults.every(Boolean)
        : conditionResults.some(Boolean);

    const current = result.get(rule.targetFieldId) ?? {
      visible: true,
      conditionallyRequired: false,
    };

    switch (rule.action) {
      case 'show':
        if (!matched) {
          current.visible = false;
        }
        break;
      case 'hide':
        if (matched) {
          current.visible = false;
        }
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
