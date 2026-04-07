import { describe, it, expect } from 'vitest';
import { evaluateAllConditions } from '../evaluateConditions';
import type { ConditionalRule } from '../../types/dynamicForm';

const fieldMeta = [
  { id: 'type', required: false },
  { id: 'reason', required: false },
  { id: 'detail', required: false },
  { id: 'amount', required: false },
];

describe('evaluateAllConditions', () => {
  it('should default all fields to visible', () => {
    const result = evaluateAllConditions([], {}, fieldMeta);
    expect(result.get('type')?.visible).toBe(true);
    expect(result.get('reason')?.visible).toBe(true);
  });

  it('should show field when equals condition matches', () => {
    const rules: ConditionalRule[] = [
      {
        targetFieldId: 'reason',
        action: 'show',
        matchType: 'all',
        conditions: [
          { sourceFieldId: 'type', operator: 'equals', value: 'OTHER' },
        ],
      },
    ];

    const visible = evaluateAllConditions(rules, { type: 'OTHER' }, fieldMeta);
    expect(visible.get('reason')?.visible).toBe(true);

    const hidden = evaluateAllConditions(rules, { type: 'NORMAL' }, fieldMeta);
    expect(hidden.get('reason')?.visible).toBe(false);
  });

  it('should hide field when not_equals condition matches', () => {
    const rules: ConditionalRule[] = [
      {
        targetFieldId: 'detail',
        action: 'hide',
        matchType: 'all',
        conditions: [
          { sourceFieldId: 'type', operator: 'not_equals', value: 'NORMAL' },
        ],
      },
    ];

    const result = evaluateAllConditions(rules, { type: 'OTHER' }, fieldMeta);
    expect(result.get('detail')?.visible).toBe(false);

    const result2 = evaluateAllConditions(rules, { type: 'NORMAL' }, fieldMeta);
    expect(result2.get('detail')?.visible).toBe(true);
  });

  it('should handle is_empty operator', () => {
    const rules: ConditionalRule[] = [
      {
        targetFieldId: 'detail',
        action: 'show',
        matchType: 'all',
        conditions: [
          { sourceFieldId: 'reason', operator: 'is_empty' },
        ],
      },
    ];

    const empty = evaluateAllConditions(rules, { reason: '' }, fieldMeta);
    expect(empty.get('detail')?.visible).toBe(true);

    const filled = evaluateAllConditions(rules, { reason: 'test' }, fieldMeta);
    expect(filled.get('detail')?.visible).toBe(false);
  });

  it('should handle is_not_empty operator', () => {
    const rules: ConditionalRule[] = [
      {
        targetFieldId: 'amount',
        action: 'show',
        matchType: 'all',
        conditions: [
          { sourceFieldId: 'type', operator: 'is_not_empty' },
        ],
      },
    ];

    const result = evaluateAllConditions(rules, { type: 'A' }, fieldMeta);
    expect(result.get('amount')?.visible).toBe(true);

    const result2 = evaluateAllConditions(rules, {}, fieldMeta);
    expect(result2.get('amount')?.visible).toBe(false);
  });

  it('should use any matchType (at least one condition)', () => {
    const rules: ConditionalRule[] = [
      {
        targetFieldId: 'detail',
        action: 'show',
        matchType: 'any',
        conditions: [
          { sourceFieldId: 'type', operator: 'equals', value: 'A' },
          { sourceFieldId: 'reason', operator: 'equals', value: 'B' },
        ],
      },
    ];

    const result = evaluateAllConditions(
      rules,
      { type: 'X', reason: 'B' },
      fieldMeta,
    );
    expect(result.get('detail')?.visible).toBe(true);
  });

  it('should use all matchType (all conditions must match)', () => {
    const rules: ConditionalRule[] = [
      {
        targetFieldId: 'detail',
        action: 'show',
        matchType: 'all',
        conditions: [
          { sourceFieldId: 'type', operator: 'equals', value: 'A' },
          { sourceFieldId: 'reason', operator: 'equals', value: 'B' },
        ],
      },
    ];

    const partial = evaluateAllConditions(
      rules,
      { type: 'A', reason: 'X' },
      fieldMeta,
    );
    expect(partial.get('detail')?.visible).toBe(false);

    const full = evaluateAllConditions(
      rules,
      { type: 'A', reason: 'B' },
      fieldMeta,
    );
    expect(full.get('detail')?.visible).toBe(true);
  });

  it('should set conditionallyRequired when require action matches', () => {
    const rules: ConditionalRule[] = [
      {
        targetFieldId: 'reason',
        action: 'require',
        matchType: 'all',
        conditions: [
          { sourceFieldId: 'type', operator: 'equals', value: 'OTHER' },
        ],
      },
    ];

    const result = evaluateAllConditions(rules, { type: 'OTHER' }, fieldMeta);
    expect(result.get('reason')?.conditionallyRequired).toBe(true);
    expect(result.get('reason')?.visible).toBe(true);

    const result2 = evaluateAllConditions(rules, { type: 'NORMAL' }, fieldMeta);
    expect(result2.get('reason')?.conditionallyRequired).toBe(false);
  });
});
