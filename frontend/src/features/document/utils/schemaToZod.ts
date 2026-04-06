import { z } from 'zod';
import type { FieldDefinition, FieldConfig } from '../types/dynamicForm';
import type { FieldVisibility } from './evaluateConditions';

/**
 * JSON 스키마의 fields 배열을 Zod v4 스키마로 런타임 변환
 * staticText/section 필드는 display-only이므로 스키마에서 제외
 * hidden 필드는 항상 optional string
 * fieldVisibility가 제공되면 숨겨진 필드는 스키마에서 제외하고,
 * conditionallyRequired 필드는 필수로 처리 (D-04, D-07)
 */
export function schemaToZod(
  fields: FieldDefinition[],
  fieldVisibility?: Map<string, FieldVisibility>,
): z.ZodObject<Record<string, z.ZodType>> {
  const shape: Record<string, z.ZodType> = {};

  for (const field of fields) {
    if (field.type === 'staticText') continue; // display only
    if (field.type === 'section') continue; // structural only

    // 숨겨진 필드는 유효성 검사에서 제외 (D-04)
    const visibility = fieldVisibility?.get(field.id);
    if (visibility && !visibility.visible) continue;

    if (field.type === 'hidden') {
      shape[field.id] = z.string().optional();
      continue;
    }

    // 유효 필수 상태: field.required OR conditionallyRequired (D-07, OR 관계)
    const effectiveRequired = field.required || (visibility?.conditionallyRequired ?? false);
    shape[field.id] = buildFieldZod({ ...field, required: effectiveRequired });
  }

  return z.object(shape);
}

function buildFieldZod(field: FieldDefinition): z.ZodType {
  const config = field.config;
  const label = field.label;

  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'date':
    case 'select':
      return buildStringZod(field.required, label, config);

    case 'number':
      return buildNumberZod(field.required, label, config);

    case 'table':
      return buildTableZod(field.required, label, config);

    default:
      return z.any();
  }
}

function buildStringZod(required: boolean, label: string, config?: FieldConfig): z.ZodType {
  let schema = z.string();

  if (config?.maxLength) {
    schema = schema.max(config.maxLength, {
      error: `${label}은(는) ${config.maxLength}자 이하여야 합니다`,
    });
  }

  if (required) {
    schema = schema.min(1, {
      error: `${label}을(를) 입력해주세요`,
    });
  }

  return required ? schema : schema.optional();
}

function buildNumberZod(required: boolean, label: string, config?: FieldConfig): z.ZodType {
  let schema = z.coerce.number({ error: `${label}은(는) 숫자여야 합니다` });

  if (config?.min != null) {
    schema = schema.min(config.min, {
      error: `${label}은(는) ${config.min} 이상이어야 합니다`,
    });
  }
  if (config?.max != null) {
    schema = schema.max(config.max, {
      error: `${label}은(는) ${config.max} 이하여야 합니다`,
    });
  }

  return required ? schema : schema.optional();
}

function buildTableZod(required: boolean, label: string, config?: FieldConfig): z.ZodType {
  if (!config?.columns) return z.any();

  const rowShape: Record<string, z.ZodType> = {};
  for (const col of config.columns) {
    rowShape[col.id] = buildFieldZod(col);
  }

  let arraySchema = z.array(z.object(rowShape));

  const minRows = config.minRows ?? (required ? 1 : 0);
  const maxRows = config.maxRows ?? 100;

  if (minRows > 0) {
    arraySchema = arraySchema.min(minRows, {
      error: `최소 ${minRows}개의 행이 필요합니다`,
    });
  }
  if (maxRows < 100) {
    arraySchema = arraySchema.max(maxRows, {
      error: `최대 ${maxRows}개의 행까지 추가할 수 있습니다`,
    });
  }

  return required ? arraySchema : arraySchema.optional();
}

/**
 * table 필드의 columns에서 빈 행 기본값 객체 생성
 * useFieldArray의 append에 사용
 */
export function buildDefaultRow(columns: FieldDefinition[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of columns) {
    switch (col.type) {
      case 'number':
        row[col.id] = 0;
        break;
      case 'text':
      case 'textarea':
      case 'date':
      case 'select':
      default:
        row[col.id] = '';
        break;
    }
  }
  return row;
}
