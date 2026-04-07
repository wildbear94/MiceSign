import { describe, it, expect } from 'vitest';
import { executeCalculation } from '../executeCalculations';
import type { CalculationRule } from '../../types/dynamicForm';

describe('executeCalculation', () => {
  it('should SUM values from source fields', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'SUM',
      sourceFields: ['a', 'b', 'c'],
    };

    const result = executeCalculation(rule, { a: 10, b: 20, c: 30 });
    expect(result).toBe(60);
  });

  it('should handle ADD (same as SUM)', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'ADD',
      sourceFields: ['x', 'y'],
    };

    const result = executeCalculation(rule, { x: 5, y: 15 });
    expect(result).toBe(20);
  });

  it('should COUNT non-empty values', () => {
    const rule: CalculationRule = {
      targetFieldId: 'count',
      operation: 'COUNT',
      sourceFields: ['a', 'b', 'c', 'd'],
    };

    const result = executeCalculation(rule, {
      a: 'hello',
      b: '',
      c: 42,
      d: undefined,
    });
    expect(result).toBe(2);
  });

  it('should MULTIPLY values', () => {
    const rule: CalculationRule = {
      targetFieldId: 'product',
      operation: 'MULTIPLY',
      sourceFields: ['qty', 'price'],
    };

    const result = executeCalculation(rule, { qty: 3, price: 1000 });
    expect(result).toBe(3000);
  });

  it('should return 0 for MULTIPLY with no source fields', () => {
    const rule: CalculationRule = {
      targetFieldId: 'product',
      operation: 'MULTIPLY',
      sourceFields: [],
    };

    const result = executeCalculation(rule, {});
    expect(result).toBe(0);
  });

  it('should SUM table column values across rows', () => {
    const rule: CalculationRule = {
      targetFieldId: 'totalAmount',
      operation: 'SUM',
      sourceFields: ['items.amount'],
    };

    const result = executeCalculation(rule, {
      items: [
        { name: 'A', amount: 100 },
        { name: 'B', amount: 200 },
        { name: 'C', amount: 300 },
      ],
    });
    expect(result).toBe(600);
  });

  it('should COUNT non-empty table column values', () => {
    const rule: CalculationRule = {
      targetFieldId: 'filledCount',
      operation: 'COUNT',
      sourceFields: ['items.name'],
    };

    const result = executeCalculation(rule, {
      items: [
        { name: 'A' },
        { name: '' },
        { name: 'C' },
      ],
    });
    expect(result).toBe(2);
  });

  it('should handle NaN values gracefully', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'SUM',
      sourceFields: ['a', 'b'],
    };

    const result = executeCalculation(rule, { a: 'abc', b: 10 });
    expect(result).toBe(10);
  });
});
