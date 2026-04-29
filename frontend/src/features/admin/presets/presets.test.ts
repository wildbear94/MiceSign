import { describe, it, expect } from 'vitest';
import { presets } from './index';
import { templateImportSchema } from '../validations/templateImportSchema';

describe('presets', () => {
  it('contains exactly 6 presets', () => {
    expect(presets).toHaveLength(6);
  });

  it('has expected keys', () => {
    // IN-02 fix (Phase 32 REVIEW): Set-based comparison avoids coupling to
    // the `localeCompare` sort policy in presets/index.ts. The contract is
    // "all 6 keys present", not "this exact sorted order".
    const keys = new Set(presets.map((p) => p.key));
    expect(keys).toEqual(
      new Set(['expense', 'leave', 'meeting', 'proposal', 'purchase', 'trip']),
    );
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
    // IN-01 fix (Phase 32 REVIEW): replace lenient `/[가-힣]/` (single Korean
    // char passes — e.g., "X회") with whitelist-style assertion that maps each
    // preset key to its canonical Korean name. Catches both partial-Korean
    // names and accidental name changes.
    const expectedNames: Record<string, string> = {
      expense: '경비신청서',
      leave: '휴가신청서',
      trip: '출장신청서',
      purchase: '구매신청서',
      meeting: '회의록',
      proposal: '품의서',
    };
    for (const p of presets) {
      const expected = expectedNames[p.key];
      expect(expected, `unknown preset key: ${p.key}`).toBeDefined();
      expect(p.data.name).toBe(expected);
      // Defensive: every char must be Korean letter, space, or middle-dot
      expect(p.data.name).toMatch(/^[가-힣\s·]+$/);
      expect(p.data.name.length).toBeGreaterThanOrEqual(2);
    }
  });
});
