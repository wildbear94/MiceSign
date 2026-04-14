import { z, type ZodError } from 'zod';

/**
 * Phase 26 Plan 01 — Template Import Zod Schema
 *
 * Version fields distinction (RESEARCH.md Pitfall 1):
 *   - exportFormatVersion: 1 — this import/export file envelope version (D-05)
 *   - schemaVersion: persisted template's schema version (backend-driven)
 *   - schemaDefinition.version: per-schema structural version (inner doc)
 *
 * Security (RESEARCH.md §Security Domain, T-26-01):
 *   - fieldConfigSchema uses .strict() to reject unknown keys including
 *     `__proto__`, `constructor`, `prototype` — blocks prototype pollution.
 */

const fieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'table',
  'staticText',
  'hidden',
]);

const optionItemSchema = z.object({
  value: z.string(),
  label: z.string(),
  sortOrder: z.number().int().optional(),
});

// Column schema — config uses z.any() to preserve recursion compatibility with
// existing FieldConfig. Columns typically don't nest further in practice.
const columnSchema = z.object({
  id: z.string().min(1),
  type: fieldTypeSchema,
  label: z.string().min(1),
  required: z.boolean().optional(),
  config: z.any().optional(),
});

const fieldConfigSchema = z
  .object({
    placeholder: z.string().optional(),
    maxLength: z.number().int().nonnegative().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    unit: z.string().optional(),
    options: z.array(optionItemSchema).optional(),
    content: z.string().optional(),
    defaultValue: z.string().optional(),
    minRows: z.number().int().nonnegative().optional(),
    maxRows: z.number().int().nonnegative().optional(),
    columns: z.array(columnSchema).optional(),
  })
  .strict(); // T-26-01: reject unknown keys incl. __proto__

const fieldDefinitionSchema = z.object({
  id: z.string().min(1),
  type: fieldTypeSchema,
  label: z.string().min(1),
  required: z.boolean(),
  config: fieldConfigSchema.optional(),
});

const conditionalRuleSchema = z.object({
  targetFieldId: z.string().min(1),
  condition: z.object({
    fieldId: z.string().min(1),
    operator: z.string().min(1),
    value: z.unknown(),
  }),
  action: z.enum(['show', 'hide', 'require', 'unrequire']),
});

const calculationRuleSchema = z.object({
  targetFieldId: z.string().min(1),
  formula: z.string().min(1),
  dependsOn: z.array(z.string()),
});

const schemaDefinitionSchema = z.object({
  version: z.number().int().positive(),
  fields: z.array(fieldDefinitionSchema),
  conditionalRules: z.array(conditionalRuleSchema).optional(),
  calculationRules: z.array(calculationRuleSchema).optional(),
});

export const templateImportSchema = z.object({
  exportFormatVersion: z.literal(1),
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  prefix: z.string().min(1),
  category: z.string().optional(),
  icon: z.string().optional(),
  schemaDefinition: schemaDefinitionSchema,
});

export type TemplateImportData = z.infer<typeof templateImportSchema>;

/**
 * Flattens a ZodError into a simple list of `{ path, message }` entries
 * suitable for display in an error list UI. Paths are joined with `.`;
 * root-level issues use the literal `(root)`.
 */
export function flattenZodErrors(
  error: ZodError,
): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    message: issue.message,
  }));
}
