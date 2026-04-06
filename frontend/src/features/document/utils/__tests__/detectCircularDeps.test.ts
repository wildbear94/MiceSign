import { describe, it, expect } from 'vitest';
import { detectCircularDeps } from '../detectCircularDeps';
import type { ConditionalRule, CalculationRule } from '../../types/dynamicForm';

describe('detectCircularDeps', () => {
  it('returns null for empty rules', () => {
    const result = detectCircularDeps([], []);
    expect(result).toBeNull();
  });

  it('returns null for acyclic graph (A->B->C)', () => {
    const conditionalRules: ConditionalRule[] = [
      {
        targetFieldId: 'B',
        action: 'show',
        matchType: 'all',
        conditions: [{ sourceFieldId: 'A', operator: 'equals', value: 'x' }],
      },
      {
        targetFieldId: 'C',
        action: 'show',
        matchType: 'all',
        conditions: [{ sourceFieldId: 'B', operator: 'equals', value: 'y' }],
      },
    ];
    const result = detectCircularDeps(conditionalRules, []);
    expect(result).toBeNull();
  });

  it('detects simple A<->B cycle via conditional rules', () => {
    const conditionalRules: ConditionalRule[] = [
      {
        targetFieldId: 'B',
        action: 'show',
        matchType: 'all',
        conditions: [{ sourceFieldId: 'A', operator: 'equals', value: 'x' }],
      },
      {
        targetFieldId: 'A',
        action: 'show',
        matchType: 'all',
        conditions: [{ sourceFieldId: 'B', operator: 'equals', value: 'y' }],
      },
    ];
    const result = detectCircularDeps(conditionalRules, []);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(2);
    // Cycle should contain both A and B
    expect(result).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('detects 3-node cycle (A->B->C->A)', () => {
    const conditionalRules: ConditionalRule[] = [
      {
        targetFieldId: 'B',
        action: 'show',
        matchType: 'all',
        conditions: [{ sourceFieldId: 'A', operator: 'equals', value: 'x' }],
      },
      {
        targetFieldId: 'C',
        action: 'show',
        matchType: 'all',
        conditions: [{ sourceFieldId: 'B', operator: 'equals', value: 'y' }],
      },
      {
        targetFieldId: 'A',
        action: 'show',
        matchType: 'all',
        conditions: [{ sourceFieldId: 'C', operator: 'equals', value: 'z' }],
      },
    ];
    const result = detectCircularDeps(conditionalRules, []);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(3);
  });

  it('detects cycles through calculation rules', () => {
    const calculationRules: CalculationRule[] = [
      { targetFieldId: 'B', operation: 'SUM', sourceFields: ['A'] },
      { targetFieldId: 'A', operation: 'SUM', sourceFields: ['B'] },
    ];
    const result = detectCircularDeps([], calculationRules);
    expect(result).not.toBeNull();
    expect(result).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('detects cycles across conditional + calculation rules', () => {
    const conditionalRules: ConditionalRule[] = [{
      targetFieldId: 'B',
      action: 'show',
      matchType: 'all',
      conditions: [{ sourceFieldId: 'A', operator: 'equals', value: 'x' }],
    }];
    const calculationRules: CalculationRule[] = [
      { targetFieldId: 'A', operation: 'SUM', sourceFields: ['B'] },
    ];
    const result = detectCircularDeps(conditionalRules, calculationRules);
    expect(result).not.toBeNull();
    expect(result).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('detects self-reference', () => {
    const calculationRules: CalculationRule[] = [
      { targetFieldId: 'A', operation: 'SUM', sourceFields: ['A'] },
    ];
    const result = detectCircularDeps([], calculationRules);
    expect(result).not.toBeNull();
    expect(result).toContain('A');
  });
});
