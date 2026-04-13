import type {
  SchemaField,
  TableColumn,
  TableColumnType,
} from '../../../admin/components/SchemaFieldEditor/types';
import type {
  FieldDefinition,
  ColumnDefinition,
  FieldType,
  OptionItem,
  FieldConfig,
} from '../../types/dynamicForm';

/**
 * Phase 24.1-02 Task 3: admin SchemaField → user FieldDefinition adapter.
 *
 * 두 타입은 거의 동일한 구조이지만 다음 차이가 있어 명시적 변환이 필요하다:
 *
 * - admin `SchemaField.config` 는 non-optional, user `FieldDefinition.config` 는 optional.
 * - admin `TableColumnType` 에는 `'checkbox'` 가 존재하지만, user `FieldType` 에는 없다.
 *   현재 단계에서는 `'checkbox'` 를 `'text'` 로 폴백한다 (Phase 24.1 범위 외 deferred).
 * - admin option 객체에는 `sortOrder` 필드가 없다 → 배열 인덱스를 사용해 보강한다.
 *
 * 결과 FieldDefinition 은 항상 `config` 객체를 포함 (옵션/컬럼은 `config.options` /
 * `config.columns` 에 위치) — DynamicFieldRenderer 가 이 형태를 가정한다.
 */
export function adaptSchemaFieldToFieldDefinition(
  f: SchemaField,
): FieldDefinition {
  return {
    id: f.id,
    type: f.type as FieldType,
    label: f.label,
    required: f.required,
    config: adaptConfig(f.config ?? {}),
  };
}

export function adaptSchemaFields(fields: SchemaField[]): FieldDefinition[] {
  return fields.map(adaptSchemaFieldToFieldDefinition);
}

function adaptConfig(
  src: NonNullable<SchemaField['config']> | Record<string, never>,
): FieldConfig {
  const adapted: FieldConfig = {
    placeholder: src.placeholder,
    maxLength: src.maxLength,
    min: src.min,
    max: src.max,
    unit: src.unit,
    content: src.content,
    defaultValue: src.defaultValue,
    minRows: src.minRows,
    maxRows: src.maxRows,
  };

  if (src.options && src.options.length > 0) {
    adapted.options = src.options.map(
      (o, idx): OptionItem => ({
        value: o.value,
        label: o.label,
        sortOrder: idx,
      }),
    );
  }

  if (src.columns && src.columns.length > 0) {
    adapted.columns = src.columns.map(adaptTableColumn);
  }

  return adapted;
}

function adaptTableColumn(c: TableColumn): ColumnDefinition {
  return {
    id: c.id,
    type: mapColumnType(c.type),
    label: c.label,
    required: c.required,
    config: adaptConfig(c.config ?? {}),
  };
}

/**
 * admin TableColumnType → user FieldType 매핑.
 * 'checkbox' 는 user 측 미지원 — 'text' 로 폴백 (Phase 24.1 범위 외).
 */
function mapColumnType(type: TableColumnType): FieldType {
  if (type === 'checkbox') return 'text';
  return type;
}
