import { describe, it, expect } from 'vitest';
import { evaluateConditions } from '../evaluateConditions';
import type { ConditionalRule } from '../../types/dynamicForm';

const fields = [
  { id: 'field1', required: false },
  { id: 'field2', required: false },
  { id: 'field3', required: true },
];

describe('evaluateConditions', () => {
  it('returns all fields visible with no rules', () => {
    const result = evaluateConditions([], {}, fields);
    expect(result.get('field1')).toEqual({ visible: true, conditionallyRequired: false });
    expect(result.get('field2')).toEqual({ visible: true, conditionallyRequired: false });
    expect(result.get('field3')).toEqual({ visible: true, conditionallyRequired: false });
  });

  it('show action hides field when equals condition NOT met', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field2',
      action: 'show',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'field1', operator: 'equals', value: 'yes' }],
    }];
    const result = evaluateConditions(rules, { field1: 'no' }, fields);
    expect(result.get('field2')!.visible).toBe(false);
  });

  it('show action shows field when equals condition met', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field2',
      action: 'show',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'field1', operator: 'equals', value: 'yes' }],
    }];
    const result = evaluateConditions(rules, { field1: 'yes' }, fields);
    expect(result.get('field2')!.visible).toBe(true);
  });

  it('hide action hides field when condition met', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field2',
      action: 'hide',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'field1', operator: 'equals', value: 'yes' }],
    }];
    const result = evaluateConditions(rules, { field1: 'yes' }, fields);
    expect(result.get('field2')!.visible).toBe(false);
  });

  it('hide action keeps field visible when condition NOT met', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field2',
      action: 'hide',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'field1', operator: 'equals', value: 'yes' }],
    }];
    const result = evaluateConditions(rules, { field1: 'no' }, fields);
    expect(result.get('field2')!.visible).toBe(true);
  });

  it('require action sets conditionallyRequired when met', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field2',
      action: 'require',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'field1', operator: 'equals', value: 'yes' }],
    }];
    const result = evaluateConditions(rules, { field1: 'yes' }, fields);
    expect(result.get('field2')!.conditionallyRequired).toBe(true);
    expect(result.get('field2')!.visible).toBe(true);
  });

  it('not_equals operator works correctly', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field2',
      action: 'show',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'field1', operator: 'not_equals', value: 'yes' }],
    }];
    // field1 = 'no' -> not_equals 'yes' is true -> show
    const result = evaluateConditions(rules, { field1: 'no' }, fields);
    expect(result.get('field2')!.visible).toBe(true);
  });

  it('is_empty operator works correctly', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field2',
      action: 'show',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'field1', operator: 'is_empty' }],
    }];
    const result = evaluateConditions(rules, { field1: '' }, fields);
    expect(result.get('field2')!.visible).toBe(true);

    const result2 = evaluateConditions(rules, { field1: 'value' }, fields);
    expect(result2.get('field2')!.visible).toBe(false);
  });

  it('is_not_empty operator works correctly', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field2',
      action: 'show',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'field1', operator: 'is_not_empty' }],
    }];
    const result = evaluateConditions(rules, { field1: 'value' }, fields);
    expect(result.get('field2')!.visible).toBe(true);

    const result2 = evaluateConditions(rules, {}, fields);
    expect(result2.get('field2')!.visible).toBe(false);
  });

  it('matchType all requires ALL conditions true', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field3',
      action: 'show',
      matchType: 'all',
      conditions: [
        { sourceFieldId: 'field1', operator: 'equals', value: 'a' },
        { sourceFieldId: 'field2', operator: 'equals', value: 'b' },
      ],
    }];
    // Only one matches -> hidden
    const result = evaluateConditions(rules, { field1: 'a', field2: 'x' }, fields);
    expect(result.get('field3')!.visible).toBe(false);

    // Both match -> shown
    const result2 = evaluateConditions(rules, { field1: 'a', field2: 'b' }, fields);
    expect(result2.get('field3')!.visible).toBe(true);
  });

  it('matchType any requires at least ONE condition true', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field3',
      action: 'show',
      matchType: 'any',
      conditions: [
        { sourceFieldId: 'field1', operator: 'equals', value: 'a' },
        { sourceFieldId: 'field2', operator: 'equals', value: 'b' },
      ],
    }];
    // One matches -> shown
    const result = evaluateConditions(rules, { field1: 'a', field2: 'x' }, fields);
    expect(result.get('field3')!.visible).toBe(true);

    // None match -> hidden
    const result2 = evaluateConditions(rules, { field1: 'x', field2: 'x' }, fields);
    expect(result2.get('field3')!.visible).toBe(false);
  });

  it('handles null/undefined form values gracefully', () => {
    const rules: ConditionalRule[] = [{
      targetFieldId: 'field2',
      action: 'show',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'field1', operator: 'is_empty' }],
    }];
    // undefined value -> is_empty should be true
    const result = evaluateConditions(rules, {}, fields);
    expect(result.get('field2')!.visible).toBe(true);
  });
});
