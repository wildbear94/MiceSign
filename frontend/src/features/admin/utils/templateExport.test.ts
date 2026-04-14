import { describe, it, expect } from 'vitest';
import type { TemplateDetailItem } from '../api/templateApi';
import { buildExportPayload, buildExportFilename } from './templateExport';

const makeDetail = (over: Partial<TemplateDetailItem> = {}): TemplateDetailItem => ({
  id: 42,
  code: 'CUSTOM_test123',
  name: '테스트',
  description: '설명',
  prefix: 'TST',
  category: 'general',
  icon: 'FileText',
  schemaVersion: 3,
  schemaDefinition: JSON.stringify({
    version: 1,
    fields: [],
    conditionalRules: [],
    calculationRules: [],
  }),
  isActive: true,
  isCustom: true,
  sortOrder: 0,
  budgetEnabled: false,
  createdBy: 'admin',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});

describe('buildExportPayload', () => {
  it('includes exportFormatVersion: 1', () => {
    const payload = buildExportPayload(makeDetail());
    expect(payload.exportFormatVersion).toBe(1);
  });

  it('excludes code/id/createdBy/createdAt/isActive keys (D-05)', () => {
    const payload = buildExportPayload(makeDetail());
    const keys = Object.keys(payload);
    expect(keys).not.toContain('code');
    expect(keys).not.toContain('id');
    expect(keys).not.toContain('createdBy');
    expect(keys).not.toContain('createdAt');
    expect(keys).not.toContain('isActive');
  });

  it('normalizes empty description/category/icon to undefined', () => {
    const payload = buildExportPayload(
      makeDetail({ description: '', category: '', icon: '' }),
    );
    expect(payload.description).toBeUndefined();
    expect(payload.category).toBeUndefined();
    expect(payload.icon).toBeUndefined();
  });

  it('falls back to { version: 1, fields: [] } when schemaDefinition is null', () => {
    const payload = buildExportPayload(makeDetail({ schemaDefinition: null }));
    expect(payload.schemaDefinition).toEqual({ version: 1, fields: [] });
  });

  it('parses schemaDefinition JSON string', () => {
    const inner = { version: 2, fields: [{ id: 'a', type: 'text', label: 'A', required: false }] };
    const payload = buildExportPayload(
      makeDetail({ schemaDefinition: JSON.stringify(inner) }),
    );
    expect(payload.schemaDefinition).toEqual(inner);
  });
});

describe('buildExportFilename', () => {
  it('formats {code}-YYYYMMDD.json', () => {
    const name = buildExportFilename('CUSTOM_ab12cd', new Date('2026-04-13T10:00:00Z'));
    // Local time may differ; normalize by constructing with explicit ymd pieces
    expect(name).toMatch(/^CUSTOM_ab12cd-\d{8}\.json$/);
  });

  it('sanitizes non-alphanumeric characters to underscores (Pitfall 5)', () => {
    const date = new Date(2026, 3, 13); // local 2026-04-13
    const name = buildExportFilename('한글code!', date);
    expect(name).toBe('__code_-20260413.json');
  });

  it('zero-pads single-digit month and day', () => {
    const date = new Date(2026, 0, 5); // local 2026-01-05
    const name = buildExportFilename('X', date);
    expect(name).toBe('X-20260105.json');
  });
});
