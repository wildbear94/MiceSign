export type SchemaFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'staticText'
  | 'hidden'
  | 'table';

export type TableColumnType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'staticText';

export interface SchemaFieldConfig {
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  unit?: string;
  options?: { value: string; label: string }[];
  content?: string;
  defaultValue?: string;
  width?: string;
  columns?: TableColumn[];
  minRows?: number;
  maxRows?: number;
}

export interface TableColumn {
  id: string;
  type: TableColumnType;
  label: string;
  required: boolean;
  config: SchemaFieldConfig;
}

export interface SchemaField {
  id: string;
  type: SchemaFieldType;
  label: string;
  required: boolean;
  config: SchemaFieldConfig;
}

export interface SchemaFieldEditorProps {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}

// === Conditional Rule UI Types ===

export type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';
export type ConditionalAction = 'show' | 'hide' | 'require' | 'unrequire';

export interface OperatorOption {
  value: ComparisonOperator;
  labelKey: string; // i18n key under templates.condition.operators.*
}

export interface ActionOption {
  value: ConditionalAction;
  labelKey: string; // i18n key under templates.condition.actions.*
}

// ─── Phase 25: 계산 규칙 UI 전용 helper 타입 (D-13) ───
// CalculationRule 본체는 document/types/dynamicForm.ts 의 것을 재사용한다.

export type PresetType = 'sum-col' | 'sum-mul' | 'field-sum' | 'ratio' | 'custom';

export interface PresetConfig {
  type: PresetType;
  /**
   * 프리셋별 파라미터 (버킷):
   * - sum-col:   { tableId: string; columnId: string }
   * - sum-mul:   { tableId: string; columnA: string; columnB: string }
   * - field-sum: { fieldIds: string[] }
   * - ratio:     { numerator: string; denominator: string } // 내부적으로 * 100 고정
   * - custom:    { raw: string }
   */
  params: Record<string, unknown>;
}

/**
 * D-20: 계산 규칙의 소스 후보.
 * columnId 가 있으면 table 필드 내부 number 컬럼, 없으면 루트 number 필드.
 */
export interface CalcSource {
  fieldId: string;
  columnId?: string;
  label: string; // UI 표시용
}

export type CalcValidationError =
  | 'emptyFormula'
  | 'syntaxError'
  | 'unknownField'
  | 'unknownColumn'
  | 'invalidOperator'
  | 'selfReference'
  | 'circularDependency';
