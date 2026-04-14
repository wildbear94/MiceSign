import { describe, it, expect } from 'vitest';
import { presets } from './index';
import { templateImportSchema } from '../validations/templateImportSchema';

describe('presets', () => {
  it('contains exactly 4 presets', () => {
    expect(presets).toHaveLength(4);
  });

  it('has expected keys', () => {
    const keys = presets.map((p) => p.key).sort();
    expect(keys).toEqual(['expense', 'leave', 'purchase', 'trip']);
  });

  it('each preset passes templateImportSchema', () => {
    for (const p of presets) {
      const result = templateImportSchema.safeParse(p.data);
      expect(
        result.success,
        `${p.key} failed: ${JSON.stringify(result.success ? null : result.error.issues)}`,
      ).toBe(true);
    }
  });

  it('expense preset has at least one calculationRule', () => {
    const expense = presets.find((p) => p.key === 'expense')!;
    expect(expense.data.schemaDefinition.calculationRules?.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('leave preset has at least one conditionalRule', () => {
    const leave = presets.find((p) => p.key === 'leave')!;
    expect(leave.data.schemaDefinition.conditionalRules?.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('purchase preset has at least one table field', () => {
    const purchase = presets.find((p) => p.key === 'purchase')!;
    const hasTable = purchase.data.schemaDefinition.fields.some((f) => f.type === 'table');
    expect(hasTable).toBe(true);
  });

  it('all preset names are Korean', () => {
    for (const p of presets) {
      expect(p.data.name).toMatch(/[가-힣]/);
    }
  });
});
