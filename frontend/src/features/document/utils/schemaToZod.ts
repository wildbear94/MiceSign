import { z } from 'zod';
import type {
  SchemaDefinition,
  FieldDefinition,
  ColumnDefinition,
  FieldType,
} from '../types/dynamicForm';

/**
 * Build a Zod schema for a single field based on its FieldType and config.
 */
function fieldToZod(
  type: FieldType,
  required: boolean,
  config?: FieldDefinition['config'],
): z.ZodType {
  let schema: z.ZodType;

  switch (type) {
    case 'text': {
      let s = z.string();
      if (config?.maxLength) {
        s = s.max(config.maxLength);
      }
      schema = required ? s.min(1, { error: '필수 입력 항목입니다' }) : s;
      break;
    }

    case 'textarea': {
      let s = z.string();
      if (config?.maxLength) {
        s = s.max(config.maxLength);
      }
      schema = required ? s.min(1, { error: '필수 입력 항목입니다' }) : s;
      break;
    }

    case 'number': {
      let s = z.number();
      if (config?.min != null) {
        s = s.min(config.min);
      }
      if (config?.max != null) {
        s = s.max(config.max);
      }
      schema = s;
      break;
    }

    case 'date': {
      const s = z.string();
      schema = required ? s.min(1, { error: '날짜를 선택해주세요' }) : s;
      break;
    }

    case 'select': {
      const validValues = config?.options?.map((o) => o.value) ?? [];
      let s = z.string();
      if (validValues.length > 0) {
        s = s.refine((val) => validValues.includes(val), {
          error: '유효한 옵션을 선택해주세요',
        }) as unknown as z.ZodString;
      }
      schema = required ? s.min(1, { error: '항목을 선택해주세요' }) : s;
      break;
    }

    case 'table': {
      const columns = config?.columns ?? [];
      const rowShape: Record<string, z.ZodType> = {};
      for (const col of columns) {
        rowShape[col.id] = fieldToZod(col.type, col.required ?? false, col.config);
        if (!(col.required ?? false)) {
          rowShape[col.id] = rowShape[col.id].optional() as z.ZodType;
        }
      }
      let arr = z.array(z.object(rowShape));
      if (config?.minRows != null) {
        arr = arr.min(config.minRows, { error: `최소 ${config.minRows}행 이상 입력해주세요` });
      }
      if (config?.maxRows != null) {
        arr = arr.max(config.maxRows, { error: `최대 ${config.maxRows}행까지 입력 가능합니다` });
      }
      schema = arr;
      break;
    }

    case 'staticText':
    case 'hidden':
      schema = z.any();
      break;

    default:
      schema = z.any();
  }

  if (!required && type !== 'table' && type !== 'staticText' && type !== 'hidden') {
    schema = schema.optional() as z.ZodType;
  }

  return schema;
}

/**
 * Convert a SchemaDefinition into a Zod object schema for React Hook Form validation.
 */
export function schemaToZod(schema: SchemaDefinition): z.ZodObject<Record<string, z.ZodType>> {
  const shape: Record<string, z.ZodType> = {};

  for (const field of schema.fields) {
    // staticText fields are display-only; skip from validation shape
    if (field.type === 'staticText') continue;

    shape[field.id] = fieldToZod(field.type, field.required, field.config);
  }

  return z.object(shape);
}

/**
 * Build a default row object for a table field based on its column definitions.
 */
export function buildDefaultRow(columns: ColumnDefinition[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const col of columns) {
    row[col.id] = getDefaultForType(col.type, col.config);
  }

  return row;
}

/**
 * Build default form values from a SchemaDefinition.
 */
export function buildDefaultValues(schema: SchemaDefinition): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of schema.fields) {
    if (field.type === 'staticText') continue;

    // Use explicit defaultValue from config if provided
    if (field.config?.defaultValue != null) {
      if (field.type === 'number') {
        values[field.id] = Number(field.config.defaultValue);
      } else {
        values[field.id] = field.config.defaultValue;
      }
      continue;
    }

    values[field.id] = getDefaultForType(field.type, field.config);
  }

  return values;
}

/**
 * Get the default value for a given field type.
 */
function getDefaultForType(type: FieldType, config?: FieldDefinition['config']): unknown {
  switch (type) {
    case 'text':
    case 'textarea':
    case 'date':
    case 'select':
      return '';
    case 'number':
      return config?.min ?? 0;
    case 'table': {
      const columns = config?.columns ?? [];
      const minRows = config?.minRows ?? 1;
      return Array.from({ length: minRows }, () => buildDefaultRow(columns));
    }
    case 'hidden':
      return '';
    default:
      return undefined;
  }
}
