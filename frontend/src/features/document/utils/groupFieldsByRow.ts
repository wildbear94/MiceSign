/**
 * Phase 36 — pure utility grouping fields into single-row or grid row groups.
 *
 * Walks fields in declaration order. Same-numbered consecutive non-wide rowGroup
 * values form one grid group (capped at 3 cols defensively; Zod is upstream guard).
 * Wide types (textarea/table) ALWAYS render as single-row regardless of rowGroup
 * (D-C1, D-C2). Fields with rowGroup === undefined render single-row (D-D1 backward
 * compat: legacy snapshots have no rowGroup → identical to current vertical-stack).
 *
 * Generic over `T extends { id, type, rowGroup? }` so both SchemaField (builder
 * type) and FieldDefinition (renderer type) flow through without conversion.
 *
 * Module-scope WIDE_TYPES Set is local — does NOT import from
 * admin/components/SchemaFieldEditor/constants.ts to avoid cross-feature
 * coupling and circular imports between admin and document features. The
 * authoritative WIDE_TYPES list ('textarea', 'table') is also enforced at the
 * Zod validation layer (admin/validations/templateImportSchema.ts) and at the
 * builder UI layer (admin/.../constants.ts WIDE_TYPES).
 */

const WIDE_TYPES = new Set<string>(['textarea', 'table']);

export type FieldRowGroup<T extends { id: string; type: string; rowGroup?: number }> =
  | { kind: 'single'; field: T }
  | { kind: 'grid'; rowGroup: number; cols: 1 | 2 | 3; fields: T[] };

export function groupFieldsByRow<
  T extends { id: string; type: string; rowGroup?: number },
>(fields: T[]): FieldRowGroup<T>[] {
  const result: FieldRowGroup<T>[] = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    if (WIDE_TYPES.has(f.type) || f.rowGroup === undefined) {
      result.push({ kind: 'single', field: f });
      i++;
      continue;
    }
    const groupNumber = f.rowGroup;
    const bucket: T[] = [];
    while (
      i < fields.length &&
      fields[i].rowGroup === groupNumber &&
      !WIDE_TYPES.has(fields[i].type)
    ) {
      bucket.push(fields[i]);
      i++;
    }
    // Defensive cap (Zod is upstream — defense in depth per UI-SPEC line 179).
    // If admin builder somehow emits >3 same-row non-wide fields (Zod bypass or
    // legacy import), emit first 3 as a grid and re-process leftovers as singles.
    if (bucket.length > 3) {
      const head = bucket.slice(0, 3);
      result.push({ kind: 'grid', rowGroup: groupNumber, cols: 3, fields: head });
      for (const leftover of bucket.slice(3)) {
        result.push({ kind: 'single', field: leftover });
      }
    } else {
      const cols = Math.min(bucket.length, 3) as 1 | 2 | 3;
      result.push({ kind: 'grid', rowGroup: groupNumber, cols, fields: bucket });
    }
  }
  return result;
}
