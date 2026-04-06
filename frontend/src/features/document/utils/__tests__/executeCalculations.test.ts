import { describe, it, expect } from 'vitest';
import { executeCalculation } from '../executeCalculations';
import type { CalculationRule } from '../../types/dynamicForm';

describe('executeCalculation', () => {
  it('SUM adds all source values', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'SUM',
      sourceFields: ['a', 'b', 'c'],
    };
    const result = executeCalculation(rule, { a: 10, b: 20, c: 30 });
    expect(result).toBe(60);
  });

  it('ADD is same as SUM', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'ADD',
      sourceFields: ['a', 'b'],
    };
    const result = executeCalculation(rule, { a: 5, b: 15 });
    expect(result).toBe(20);
  });

  it('MULTIPLY multiplies all source values', () => {
    const rule: CalculationRule = {
      targetFieldId: 'product',
      operation: 'MULTIPLY',
      sourceFields: ['a', 'b', 'c'],
    };
    const result = executeCalculation(rule, { a: 2, b: 3, c: 4 });
    expect(result).toBe(24);
  });

  it('COUNT returns count of source values', () => {
    const rule: CalculationRule = {
      targetFieldId: 'count',
      operation: 'COUNT',
      sourceFields: ['a', 'b', 'c'],
    };
    const result = executeCalculation(rule, { a: 10, b: 20, c: 30 });
    expect(result).toBe(3);
  });

  it('treats non-numeric values as 0 for SUM', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'SUM',
      sourceFields: ['a', 'b', 'c'],
    };
    const result = executeCalculation(rule, { a: 10, b: 'abc', c: null });
    expect(result).toBe(10);
  });

  it('treats non-numeric values as 0 for MULTIPLY', () => {
    const rule: CalculationRule = {
      targetFieldId: 'product',
      operation: 'MULTIPLY',
      sourceFields: ['a', 'b'],
    };
    const result = executeCalculation(rule, { a: 5, b: 'abc' });
    expect(result).toBe(0);
  });

  it('handles table.column references (extracts column from array rows)', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'SUM',
      sourceFields: ['expenses.amount'],
    };
    const formValues = {
      expenses: [
        { item: 'Coffee', amount: 5000 },
        { item: 'Lunch', amount: 12000 },
        { item: 'Taxi', amount: 8000 },
      ],
    };
    const result = executeCalculation(rule, formValues);
    expect(result).toBe(25000);
  });

  it('handles table.column COUNT', () => {
    const rule: CalculationRule = {
      targetFieldId: 'itemCount',
      operation: 'COUNT',
      sourceFields: ['expenses.amount'],
    };
    const formValues = {
      expenses: [
        { item: 'A', amount: 100 },
        { item: 'B', amount: 200 },
      ],
    };
    const result = executeCalculation(rule, formValues);
    expect(result).toBe(2);
  });

  it('handles missing table data gracefully', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'SUM',
      sourceFields: ['expenses.amount'],
    };
    const result = executeCalculation(rule, {});
    expect(result).toBe(0);
  });

  it('rounds result to 2 decimal places', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'SUM',
      sourceFields: ['a', 'b', 'c'],
    };
    const result = executeCalculation(rule, { a: 0.1, b: 0.2, c: 0.3 });
    expect(result).toBe(0.6);
  });

  it('handles string number values', () => {
    const rule: CalculationRule = {
      targetFieldId: 'total',
      operation: 'SUM',
      sourceFields: ['a', 'b'],
    };
    const result = executeCalculation(rule, { a: '10', b: '20' });
    expect(result).toBe(30);
  });
});
