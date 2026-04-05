// Backend SchemaDefinition/FieldDefinition/FieldConfig에 대응하는 프론트엔드 타입

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'table' | 'staticText' | 'hidden';

export interface OptionItem {
  id?: number;
  value: string;
  label: string;
  sortOrder: number;
}

export interface FieldConfig {
  // text/textarea
  placeholder?: string;
  maxLength?: number;
  // number
  min?: number;
  max?: number;
  unit?: string;
  // select
  optionSetId?: number;
  options?: OptionItem[];
  // table
  minRows?: number;
  maxRows?: number;
  columns?: FieldDefinition[];
  // staticText
  content?: string;
  // hidden
  defaultValue?: string;
}

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  config?: FieldConfig;
}

export interface SchemaDefinition {
  version: number;
  fields: FieldDefinition[];
  conditionalRules: unknown[];
  calculationRules: unknown[];
}
