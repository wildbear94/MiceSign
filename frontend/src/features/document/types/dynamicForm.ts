// === Dynamic Form Type Definitions ===
// Matches backend SchemaDefinition / FieldDefinition records

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'table'
  | 'staticText'
  | 'hidden';

export interface OptionItem {
  value: string;
  label: string;
  sortOrder?: number;
}

export interface ColumnDefinition {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  config?: FieldConfig;
}

export interface FieldConfig {
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  unit?: string;
  options?: OptionItem[];
  content?: string;
  defaultValue?: string;
  minRows?: number;
  maxRows?: number;
  columns?: ColumnDefinition[];
}

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  config?: FieldConfig;
  // Phase 36 — 1-indexed row group, undefined = single-row vertical stack
  rowGroup?: number;
}

export interface ConditionalRule {
  targetFieldId: string;
  condition: {
    fieldId: string;
    operator: string;
    value: unknown;
  };
  action: 'show' | 'hide' | 'require' | 'unrequire';
}

export interface CalculationRule {
  targetFieldId: string;
  formula: string;
  dependsOn: string[];
}

export interface SchemaDefinition {
  version: number;
  fields: FieldDefinition[];
  conditionalRules?: ConditionalRule[];
  calculationRules?: CalculationRule[];
}
