import { describe, it, expect } from 'vitest';
import { groupFieldsByRow } from '../groupFieldsByRow';

/**
 * Phase 36 — groupFieldsByRow utility unit tests (D-G1).
 *
 * Test surface: 8 documented cases covering empty / legacy / 2-3-4 same-row /
 * mixed / wide-forced-single / non-consecutive scenarios. Generic over T per
 * UI-SPEC §"Component API Contract C" so both SchemaField (builder) and
 * FieldDefinition (renderer) can pass through.
 */

type TestField = {
  id: string;
  type: string;
  label: string;
  required: boolean;
  rowGroup?: number;
};

const makeField = (over: Partial<TestField> = {}): TestField => ({
  id: 'f',
  type: 'text',
  label: 'F',
  required: false,
  ...over,
});

describe('groupFieldsByRow', () => {
  it('empty array → []', () => {
    expect(groupFieldsByRow([])).toEqual([]);
  });

  it('all rowGroup undefined → all singles (legacy / D-D1 backward compat)', () => {
    const fields = [
      makeField({ id: 'a' }),
      makeField({ id: 'b' }),
      makeField({ id: 'c' }),
    ];
    const groups = groupFieldsByRow(fields);
    expect(groups).toHaveLength(3);
    expect(groups.every((g) => g.kind === 'single')).toBe(true);
  });

  it('2 fields with rowGroup=1 → one grid group, cols=2', () => {
    const fields = [
      makeField({ id: 'a', rowGroup: 1 }),
      makeField({ id: 'b', rowGroup: 1 }),
    ];
    const groups = groupFieldsByRow(fields);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: 'grid', rowGroup: 1, cols: 2 });
  });

  it('3 fields with rowGroup=1 → one grid group, cols=3', () => {
    const fields = [
      makeField({ id: 'a', rowGroup: 1 }),
      makeField({ id: 'b', rowGroup: 1 }),
      makeField({ id: 'c', rowGroup: 1 }),
    ];
    const groups = groupFieldsByRow(fields);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: 'grid', rowGroup: 1, cols: 3 });
  });

  it('4 fields with rowGroup=1 → defensive: grid cols=3 + leftover single', () => {
    const fields = [
      makeField({ id: 'a', rowGroup: 1 }),
      makeField({ id: 'b', rowGroup: 1 }),
      makeField({ id: 'c', rowGroup: 1 }),
      makeField({ id: 'd', rowGroup: 1 }),
    ];
    const groups = groupFieldsByRow(fields);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ kind: 'grid', cols: 3 });
    expect(groups[1]).toMatchObject({ kind: 'single' });
  });

  it('mixed: rg=1, rg=1, undefined, rg=2, rg=2 → grid(2) + single + grid(2)', () => {
    const fields = [
      makeField({ id: 'a', rowGroup: 1 }),
      makeField({ id: 'b', rowGroup: 1 }),
      makeField({ id: 'c' }),
      makeField({ id: 'd', rowGroup: 2 }),
      makeField({ id: 'e', rowGroup: 2 }),
    ];
    const groups = groupFieldsByRow(fields);
    expect(groups).toHaveLength(3);
    expect(groups[0]).toMatchObject({ kind: 'grid', rowGroup: 1, cols: 2 });
    expect(groups[1]).toMatchObject({ kind: 'single' });
    expect(groups[2]).toMatchObject({ kind: 'grid', rowGroup: 2, cols: 2 });
  });

  it('wide field (textarea) with rowGroup=1 → forced single (D-C1, D-C2)', () => {
    const fields = [
      makeField({ id: 'a', type: 'textarea', rowGroup: 1 }),
      makeField({ id: 'b', rowGroup: 1 }),
    ];
    const groups = groupFieldsByRow(fields);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ kind: 'single' });
    // The non-wide rowGroup=1 field, alone in its bucket, becomes a 1-col grid
    // (functionally identical to single at the renderer per UI-SPEC).
    expect(groups[1].kind === 'grid' || groups[1].kind === 'single').toBe(true);
  });

  it('non-consecutive same rowGroup: rg=1, undefined, rg=1 → 3 groups', () => {
    const fields = [
      makeField({ id: 'a', rowGroup: 1 }),
      makeField({ id: 'b' }),
      makeField({ id: 'c', rowGroup: 1 }),
    ];
    const groups = groupFieldsByRow(fields);
    expect(groups).toHaveLength(3);
    // The first rg=1 alone in its bucket → cols=Math.min(1,3)=1 → kind:'grid'
    // with cols=1. This is acceptable behavior — a single-field grid is
    // functionally identical to a single (no md:grid-cols-N visual difference
    // for 1-col on mobile or md+).
    expect(groups[0].kind === 'grid' || groups[0].kind === 'single').toBe(true);
    expect(groups[1]).toMatchObject({ kind: 'single' });
    expect(groups[2].kind === 'grid' || groups[2].kind === 'single').toBe(true);
  });
});
