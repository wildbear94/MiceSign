import { describe, it, expect } from 'vitest';
import { presets } from './index';
import { templateImportSchema } from '../validations/templateImportSchema';

describe('presets', () => {
  it('contains exactly 6 presets', () => {
    expect(presets).toHaveLength(6);
  });

  it('has expected keys', () => {
    const keys = presets.map((p) => p.key).sort();
    expect(keys).toEqual([
      'expense',
      'leave',
      'meeting',
      'proposal',
      'purchase',
      'trip',
    ]);
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

  it('meeting preset has the required fields and 3 table fields', () => {
    // WR-02 fix (Phase 32 REVIEW): Set-based assertion + structural check
    // (table count) — order-independent, catches type regressions.
    const meeting = presets.find((p) => p.key === 'meeting')!;
    const ids = new Set(meeting.data.schemaDefinition.fields.map((f) => f.id));
    expect(ids).toEqual(
      new Set(['title', 'meetingDate', 'attendees', 'agenda', 'decisions']),
    );
    expect(
      meeting.data.schemaDefinition.fields.filter((f) => f.type === 'table'),
    ).toHaveLength(3);
  });

  it('proposal preset has the required fields and 3 textarea fields', () => {
    // WR-02 fix (Phase 32 REVIEW): Set-based assertion + structural check
    // (textarea count) — order-independent, catches type regressions.
    const proposal = presets.find((p) => p.key === 'proposal')!;
    const ids = new Set(proposal.data.schemaDefinition.fields.map((f) => f.id));
    expect(ids).toEqual(
      new Set(['title', 'background', 'proposal', 'expectedEffect']),
    );
    expect(
      proposal.data.schemaDefinition.fields.filter((f) => f.type === 'textarea'),
    ).toHaveLength(3);
  });

  it('all preset names are Korean', () => {
    for (const p of presets) {
      expect(p.data.name).toMatch(/[가-힣]/);
    }
  });
});
