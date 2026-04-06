// Backend SchemaDefinition/FieldDefinition/FieldConfig에 대응하는 프론트엔드 타입

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'table' | 'staticText' | 'hidden' | 'section';

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
  // layout
  width?: 'full' | 'half';
  // calculation (number fields only)
  calculationType?: 'SUM' | 'MULTIPLY' | 'ADD' | 'COUNT';
  calculationSourceFields?: string[];
}

// 조건부 규칙 (D-05: 조건부 표시/숨기기/필수)
export interface ConditionalRuleCondition {
  sourceFieldId: string;
  operator: 'equals' | 'not_equals' | 'is_empty' | 'is_not_empty';
  value?: string;
}

export interface ConditionalRule {
  targetFieldId: string;
  action: 'show' | 'hide' | 'require';
  matchType: 'all' | 'any';
  conditions: ConditionalRuleCondition[];
}

// 계산 규칙 (D-11: 자동 계산 필드)
export interface CalculationRule {
  targetFieldId: string;
  operation: 'SUM' | 'MULTIPLY' | 'ADD' | 'COUNT';
  sourceFields: string[];
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
  conditionalRules: ConditionalRule[];
  calculationRules: CalculationRule[];
}
