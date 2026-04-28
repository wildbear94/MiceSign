import { z } from 'zod';
import type { ConditionalRule, CalculationRule } from '../../../document/types/dynamicForm';
import type { SchemaField, SchemaFieldConfig, TableColumn } from './types';

export function toFieldId(label: string): string {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
    .replace(/\s+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/\s/g, '')
    .replace(/^(.)/, (_, c: string) => c.toLowerCase());
}

interface RawColumn {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  config?: Record<string, unknown>;
}

type RawField = RawColumn;

const schemaFieldSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  required: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const schemaDefinitionSchema = z.object({
  version: z.number().optional(),
  fields: z.array(schemaFieldSchema).optional(),
  conditionalRules: z.array(z.unknown()).optional(),
  calculationRules: z.array(z.unknown()).optional(),
});

function normalizeColumn(col: RawColumn): TableColumn {
  return {
    ...(col as unknown as TableColumn),
    required: col.required ?? false,
    config: (col.config ?? {}) as SchemaFieldConfig,
  };
}

function normalizeField(field: RawField): SchemaField {
  const config = (field.config ?? {}) as SchemaFieldConfig;
  const normalizedConfig: SchemaFieldConfig = {
    ...config,
    columns: config.columns?.map((c) => normalizeColumn(c as unknown as RawColumn)),
  };
  return {
    ...(field as unknown as SchemaField),
    required: field.required ?? false,
    config: normalizedConfig,
  };
}

export interface ParsedSchemaDefinition {
  fields: SchemaField[];
  conditionalRules: ConditionalRule[];
  calculationRules: CalculationRule[];
}

export type ParseSchemaResult =
  | { ok: true; data: ParsedSchemaDefinition }
  | { ok: false; reason: 'invalid-json' | 'invalid-shape'; error: unknown };

export function parseSchemaDefinition(raw: string): ParseSchemaResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    return { ok: false, reason: 'invalid-json', error };
  }

  const result = schemaDefinitionSchema.safeParse(json);
  if (!result.success) {
    return { ok: false, reason: 'invalid-shape', error: result.error };
  }

  return {
    ok: true,
    data: {
      fields: (result.data.fields ?? []).map(normalizeField),
      conditionalRules: (result.data.conditionalRules ?? []) as ConditionalRule[],
      calculationRules: (result.data.calculationRules ?? []) as CalculationRule[],
    },
  };
}
