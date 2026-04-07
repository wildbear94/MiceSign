import { describe, it, expect } from 'vitest';
import { detectCircularDeps } from '../detectCircularDeps';
import type { ConditionalRule, CalculationRule } from '../../types/dynamicForm';

describe('detectCircularDeps', () => {
  it('should return null when no rules exist', () => {
    const result = detectCircularDeps([], []);
    expect(result).toBeNull();
  });

  it('should return null for acyclic dependencies', () => {
    const conditionalRules: ConditionalRule[] = [
      {
        targetFieldId: 'b',
        action: 'show',
        matchType: 'all',
        conditions: [{ sourceFieldId: 'a', operator: 'equals', value: 'x' }],
      },
    ];
    const calculationRules: CalculationRule[] = [
      {
        targetFieldId: 'c',
        operation: 'SUM',
        sourceFields: ['a', 'b'],
      },
    ];

    const result = detectCircularDeps(conditionalRules, calculationRules);
    expect(result).toBeNull();
  });

  it('should detect simple cycle (A -> B -> A)', () => {
    const conditionalRules: ConditionalRule[] = [
      {
        targetFieldId: 'b',
        action: 'show',
        matchType: 'all',
        conditions: [{ sourceFieldId: 'a', operator: 'equals', value: 'x' }],
      },
    ];
    const calculationRules: CalculationRule[] = [
      {
        targetFieldId: 'a',
        operation: 'SUM',
        sourceFields: ['b'],
      },
    ];

    const result = detectCircularDeps(conditionalRules, calculationRules);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(2);
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  it('should detect complex chain cycle (A -> B -> C -> A)', () => {
    const calculationRules: CalculationRule[] = [
      { targetFieldId: 'b', operation: 'SUM', sourceFields: ['a'] },
      { targetFieldId: 'c', operation: 'SUM', sourceFields: ['b'] },
      { targetFieldId: 'a', operation: 'SUM', sourceFields: ['c'] },
    ];

    const result = detectCircularDeps([], calculationRules);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle table column references in cycle detection', () => {
    const calculationRules: CalculationRule[] = [
      { targetFieldId: 'total', operation: 'SUM', sourceFields: ['items.amount'] },
    ];

    // items -> total is a one-way dependency, no cycle
    const result = detectCircularDeps([], calculationRules);
    expect(result).toBeNull();
  });
});
