import { z, type ZodTypeAny } from 'zod';
import type { FieldDefinition, TableColumn } from '../types/dynamicForm';
import type { FieldVisibility } from './evaluateConditions';

// ---------------------------------------------------------------------------
// Internal: convert a single TableColumn to a Zod type
// ---------------------------------------------------------------------------

function columnToZod(col: TableColumn): ZodTypeAny {
  switch (col.type) {
    case 'number': {
      const schema = z.coerce.number();
      return col.required ? schema : schema.optional();
    }
    case 'date':
    case 'select':
    case 'text':
    default: {
      const schema = z.string();
      return col.required
        ? schema.min(1, '필수 입력 항목입니다')
        : schema.optional().or(z.literal(''));
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: convert a single FieldDefinition to a Zod type
// ---------------------------------------------------------------------------

function fieldToZod(field: FieldDefinition, isRequired: boolean): ZodTypeAny {
  switch (field.type) {
    case 'text':
    case 'textarea': {
      let schema = z.string();
      if (field.config?.minLength) {
        schema = schema.min(field.config.minLength, '필수 입력 항목입니다');
      }
      if (field.config?.maxLength) {
        schema = schema.max(field.config.maxLength);
      }
      return isRequired
        ? schema.min(1, '필수 입력 항목입니다')
        : schema.optional().or(z.literal(''));
    }

    case 'number': {
      let schema = z.coerce.number();
      if (field.config?.min !== undefined) {
        schema = schema.min(field.config.min);
      }
      if (field.config?.max !== undefined) {
        schema = schema.max(field.config.max);
      }
      return isRequired ? schema : schema.optional();
    }

    case 'date': {
      const schema = z.string();
      return isRequired
        ? schema.min(1, '필수 입력 항목입니다')
        : schema.optional().or(z.literal(''));
    }

    case 'select': {
      const schema = z.string();
      return isRequired
        ? schema.min(1, '필수 선택 항목입니다')
        : schema.optional().or(z.literal(''));
    }

    case 'table': {
      const rowShape: Record<string, ZodTypeAny> = {};
      if (field.config?.columns) {
        for (const col of field.config.columns) {
          rowShape[col.id] = columnToZod(col);
        }
      }
      let arraySchema = z.array(z.object(rowShape));
      if (field.config?.minRows) {
        arraySchema = arraySchema.min(field.config.minRows);
      }
      if (field.config?.maxRows) {
        arraySchema = arraySchema.max(field.config.maxRows);
      }
      return isRequired ? arraySchema : arraySchema.optional();
    }

    case 'hidden':
      return z.string().optional();

    case 'staticText':
    case 'section':
      return z.any().optional();

    default:
      return z.any().optional();
  }
}

// ---------------------------------------------------------------------------
// Flatten nested sections into a flat field list
// ---------------------------------------------------------------------------

function flattenFields(fields: FieldDefinition[]): FieldDefinition[] {
  const result: FieldDefinition[] = [];
  for (const field of fields) {
    result.push(field);
    if (field.type === 'section' && field.children) {
      result.push(...flattenFields(field.children));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a dynamic form's field definitions into a Zod validation schema.
 *
 * @param fields     - Flat or nested field definitions from SchemaDefinition
 * @param visibility - Optional visibility map (from evaluateAllConditions)
 *                     Hidden fields are excluded; conditionally-required
 *                     fields are treated as required.
 */
export function schemaToZod(
  fields: FieldDefinition[],
  visibility?: Map<string, FieldVisibility>,
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of flattenFields(fields)) {
    // Skip non-data fields
    if (field.type === 'section' || field.type === 'staticText') continue;

    // Skip hidden fields (from visibility map)
    const vis = visibility?.get(field.id);
    if (vis && !vis.visible) continue;

    const isRequired =
      field.required || (vis?.conditionallyRequired ?? false);
    shape[field.id] = fieldToZod(field, isRequired);
  }

  return z.object(shape);
}
