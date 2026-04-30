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

// Column config schema — same shape as fieldConfigSchema minus nested `columns`
// to prevent unbounded recursion. Strict to reject unknown keys including __proto__.
const columnConfigSchema = z
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
  })
  .strict();

const columnSchema = z
  .object({
    id: z.string().min(1),
    type: fieldTypeSchema,
    label: z.string().min(1),
    required: z.boolean().optional(),
    config: columnConfigSchema.optional(),
  })
  .strict();

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

const fieldDefinitionSchema = z
  .object({
    id: z.string().min(1),
    type: fieldTypeSchema,
    label: z.string().min(1),
    required: z.boolean(),
    config: fieldConfigSchema.optional(),
    // Phase 36 — 1-indexed row group, optional. Wide types (textarea/table) MUST NOT
    // have rowGroup — enforced by schemaDefinitionSchema.refine() below.
    rowGroup: z.number().int().positive().optional(),
  })
  .strict();

// Phase 36 — module-scope Set to avoid per-validation reallocation.
// Mirror of WIDE_TYPES (admin/components/SchemaFieldEditor/constants.ts) but
// kept local here to avoid cross-feature imports in the validation layer.
const WIDE_TYPES_FOR_VALIDATION = new Set<string>(['textarea', 'table']);

const conditionalRuleSchema = z
  .object({
    targetFieldId: z.string().min(1),
    condition: z
      .object({
        fieldId: z.string().min(1),
        operator: z.string().min(1),
        value: z.unknown(),
      })
      .strict(),
    action: z.enum(['show', 'hide', 'require', 'unrequire']),
  })
  .strict();

const calculationRuleSchema = z
  .object({
    targetFieldId: z.string().min(1),
    formula: z.string().min(1),
    dependsOn: z.array(z.string()),
  })
  .strict();

const schemaDefinitionSchema = z
  .object({
    version: z.number().int().positive(),
    fields: z.array(fieldDefinitionSchema),
    conditionalRules: z.array(conditionalRuleSchema).optional(),
    calculationRules: z.array(calculationRuleSchema).optional(),
  })
  .strict()
  // Phase 36 Refine #1 — wide-type guard (D-C1, D-C2):
  // textarea/table fields MUST NOT carry rowGroup (they always render single-row).
  .refine(
    (s) =>
      s.fields.every(
        (f) =>
          !WIDE_TYPES_FOR_VALIDATION.has(f.type) || f.rowGroup === undefined,
      ),
    { message: 'templates.rowLayout.zodWideTypeError' },
  )
  // Phase 36 Refine #2 — hard cap=3 (D-F3):
  // Walk fields linearly; for each consecutive run of same-rowGroup non-wide fields,
  // count MUST NOT exceed 3. Wide-type fields and undefined-rowGroup fields break runs.
  .refine(
    (s) => {
      let i = 0;
      while (i < s.fields.length) {
        const rg = s.fields[i].rowGroup;
        if (
          rg === undefined ||
          WIDE_TYPES_FOR_VALIDATION.has(s.fields[i].type)
        ) {
          i++;
          continue;
        }
        let count = 0;
        while (
          i < s.fields.length &&
          s.fields[i].rowGroup === rg &&
          !WIDE_TYPES_FOR_VALIDATION.has(s.fields[i].type)
        ) {
          count++;
          i++;
        }
        if (count > 3) return false;
      }
      return true;
    },
    { message: 'templates.rowLayout.zodCapExceededError' },
  );

export const templateImportSchema = z
  .object({
    exportFormatVersion: z.literal(1),
    schemaVersion: z.number().int().positive(),
    name: z.string().min(1),
    description: z.string().optional(),
    prefix: z.string().min(1),
    category: z.string().optional(),
    icon: z.string().optional(),
    schemaDefinition: schemaDefinitionSchema,
  })
  .strict();

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
