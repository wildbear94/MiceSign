import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { templateImportSchema, flattenZodErrors } from './templateImportSchema';

const validPayload = {
  exportFormatVersion: 1,
  schemaVersion: 1,
  name: '테스트 양식',
  description: '설명',
  prefix: 'TST',
  category: 'general',
  icon: 'FileText',
  schemaDefinition: {
    version: 1,
    fields: [
      { id: 'title', type: 'text', label: '제목', required: true },
      {
        id: 'items',
        type: 'table',
        label: '항목',
        required: true,
        config: {
          columns: [
            { id: 'name', type: 'text', label: '이름', required: true },
            { id: 'qty', type: 'number', label: '수량' },
          ],
          minRows: 1,
        },
      },
    ],
    conditionalRules: [
      {
        targetFieldId: 'items',
        condition: { fieldId: 'title', operator: 'equals', value: 'x' },
        action: 'show',
      },
    ],
    calculationRules: [
      { targetFieldId: 'items', formula: 'SUM(items.qty)', dependsOn: ['items'] },
    ],
  },
};

describe('templateImportSchema', () => {
  it('accepts a fully valid D-05 payload', () => {
    const result = templateImportSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects exportFormatVersion !== 1', () => {
    const bad = { ...validPayload, exportFormatVersion: 2 };
    const result = templateImportSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join('.')).toBe('exportFormatVersion');
    }
  });

  it('rejects missing name', () => {
    const { name: _name, ...rest } = validPayload;
    void _name;
    const result = templateImportSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('name');
    }
  });

  it('rejects invalid field type (not in enum)', () => {
    const bad = {
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        fields: [{ id: 'a', type: 'invalidtype', label: 'A', required: false }],
      },
    };
    const result = templateImportSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths.some((p) => p.startsWith('schemaDefinition.fields.0.type'))).toBe(true);
    }
  });

  it('rejects invalid conditionalRules action', () => {
    const bad = {
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        conditionalRules: [
          {
            targetFieldId: 'title',
            condition: { fieldId: 'title', operator: 'equals', value: 'x' },
            action: 'explode',
          },
        ],
      },
    };
    const result = templateImportSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects calculationRules dependsOn not being array', () => {
    const bad = {
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        calculationRules: [
          { targetFieldId: 'title', formula: 'x', dependsOn: 'notanarray' },
        ],
      },
    };
    const result = templateImportSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects prototype pollution via JSON.parse __proto__ own-property (T-26-01)', () => {
    // JSON.parse creates __proto__ as a literal own-property (unlike JS object
    // literal syntax which sets [[Prototype]]). This is the actual attack surface.
    const badJson = JSON.stringify({
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        fields: [
          {
            id: 'x',
            type: 'text',
            label: 'X',
            required: false,
            config: { placeholder: 'p' },
          },
        ],
      },
    }).replace('"placeholder":"p"', '"placeholder":"p","__proto__":{"polluted":true}');
    const parsed = JSON.parse(badJson);
    // Sanity check: ensure __proto__ is a real own-property on the config object.
    const configObj = parsed.schemaDefinition.fields[0].config;
    expect(Object.prototype.hasOwnProperty.call(configObj, '__proto__')).toBe(true);
    const result = templateImportSchema.safeParse(parsed);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod .strict() reports "Unrecognized key(s) in object" for the parent path.
      // The issue message mentions the rejected key name.
      const messages = result.error.issues.map((i) => i.message).join(' ');
      expect(messages).toContain('__proto__');
    }
    // Verify global prototype was NOT polluted
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects unknown keys at top level (strict envelope)', () => {
    const bad = { ...validPayload, maliciousExtra: 'x' };
    const result = templateImportSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys in schemaDefinition (strict envelope)', () => {
    const bad = {
      ...validPayload,
      schemaDefinition: { ...validPayload.schemaDefinition, rogue: true },
    };
    const result = templateImportSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('flattenZodErrors converts issues to path/message list', () => {
    const result = templateImportSchema.safeParse({ ...validPayload, name: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      const flat = flattenZodErrors(result.error as ZodError);
      expect(Array.isArray(flat)).toBe(true);
      expect(flat.length).toBeGreaterThan(0);
      expect(flat[0]).toHaveProperty('path');
      expect(flat[0]).toHaveProperty('message');
      expect(typeof flat[0].path).toBe('string');
    }
  });

  it('accepts minimal payload without optional fields', () => {
    const minimal = {
      exportFormatVersion: 1,
      schemaVersion: 1,
      name: '미니',
      prefix: 'MIN',
      schemaDefinition: { version: 1, fields: [] },
    };
    const result = templateImportSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});

// === Phase 36 — rowGroup field tests (D-F1, D-C1, D-C2, D-F3) ===

describe('templateImportSchema — rowGroup field', () => {
  it('accepts rowGroup on text field (non-wide type)', () => {
    const payload = {
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        fields: [
          { id: 'a', type: 'text', label: 'A', required: false, rowGroup: 1 },
        ],
        conditionalRules: [],
        calculationRules: [],
      },
    };
    const result = templateImportSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects rowGroup on textarea field with i18n key zodWideTypeError', () => {
    const payload = {
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        fields: [
          { id: 'a', type: 'textarea', label: 'A', required: false, rowGroup: 1 },
        ],
        conditionalRules: [],
        calculationRules: [],
      },
    };
    const result = templateImportSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('templates.rowLayout.zodWideTypeError');
    }
  });

  it('rejects rowGroup on table field with i18n key zodWideTypeError', () => {
    const payload = {
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        fields: [
          {
            id: 't',
            type: 'table',
            label: 'T',
            required: false,
            rowGroup: 1,
            config: {
              columns: [
                { id: 'c', type: 'text', label: 'C', required: false },
              ],
            },
          },
        ],
        conditionalRules: [],
        calculationRules: [],
      },
    };
    const result = templateImportSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('templates.rowLayout.zodWideTypeError');
    }
  });

  it('accepts up to 3 consecutive same-rowGroup non-wide fields (cap=3 boundary)', () => {
    const payload = {
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        fields: [
          { id: 'a', type: 'text', label: 'A', required: false, rowGroup: 1 },
          { id: 'b', type: 'number', label: 'B', required: false, rowGroup: 1 },
          { id: 'c', type: 'date', label: 'C', required: false, rowGroup: 1 },
        ],
        conditionalRules: [],
        calculationRules: [],
      },
    };
    const result = templateImportSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects 4 consecutive same-rowGroup non-wide fields with i18n key zodCapExceededError', () => {
    const payload = {
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        fields: [
          { id: 'a', type: 'text', label: 'A', required: false, rowGroup: 1 },
          { id: 'b', type: 'number', label: 'B', required: false, rowGroup: 1 },
          { id: 'c', type: 'date', label: 'C', required: false, rowGroup: 1 },
          { id: 'd', type: 'text', label: 'D', required: false, rowGroup: 1 },
        ],
        conditionalRules: [],
        calculationRules: [],
      },
    };
    const result = templateImportSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('templates.rowLayout.zodCapExceededError');
    }
  });

  it('accepts non-consecutive same-rowGroup fields interrupted by wide field (consecutive semantic)', () => {
    // rowGroup=1, textarea (wide, no rowGroup), rowGroup=1 — algorithm short-circuits
    // per consecutive run. Two separate runs of length 1 each → both ≤3 → success.
    const payload = {
      ...validPayload,
      schemaDefinition: {
        ...validPayload.schemaDefinition,
        fields: [
          { id: 'a', type: 'text', label: 'A', required: false, rowGroup: 1 },
          { id: 'b', type: 'textarea', label: 'B', required: false },
          { id: 'c', type: 'text', label: 'C', required: false, rowGroup: 1 },
        ],
        conditionalRules: [],
        calculationRules: [],
      },
    };
    const result = templateImportSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
