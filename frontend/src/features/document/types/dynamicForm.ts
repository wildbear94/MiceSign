// ---------------------------------------------------------------------------
// Field Types
// ---------------------------------------------------------------------------

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'table'
  | 'staticText'
  | 'hidden'
  | 'section';

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  width?: 'full' | 'half' | 'third';
  config?: FieldConfig;
  conditions?: ConditionRule[];
  calculation?: CalculationConfig;
  children?: FieldDefinition[]; // for section type
}

export interface FieldConfig {
  options?: { value: string; label: string }[];
  optionSetId?: number;
  columns?: TableColumn[];
  minRows?: number;
  maxRows?: number;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  rows?: number; // textarea rows
  content?: string; // staticText content
}

export interface TableColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required?: boolean;
  width?: string;
  options?: { value: string; label: string }[];
}

// ---------------------------------------------------------------------------
// Inline condition (per-field, legacy/simple)
// ---------------------------------------------------------------------------

export interface ConditionRule {
  action: 'show' | 'hide' | 'require';
  sourceFieldId: string;
  operator: ConditionOperator;
  value?: unknown;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'notEquals'
  | 'contains'
  | 'greaterThan'
  | 'lessThan'
  | 'isEmpty'
  | 'is_empty'
  | 'isNotEmpty'
  | 'is_not_empty';

// ---------------------------------------------------------------------------
// Conditional rules (top-level, used by dynamic form engine)
// ---------------------------------------------------------------------------

export interface ConditionalRuleCondition {
  sourceFieldId: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface ConditionalRule {
  targetFieldId: string;
  action: 'show' | 'hide' | 'require';
  matchType: 'all' | 'any';
  conditions: ConditionalRuleCondition[];
}

// ---------------------------------------------------------------------------
// Calculation rules (top-level, used by dynamic form engine)
// ---------------------------------------------------------------------------

export type CalculationOperation = 'SUM' | 'MULTIPLY' | 'ADD' | 'COUNT';

export interface CalculationConfig {
  operation: CalculationOperation;
  sourceFields: string[];
}

export interface CalculationRule {
  targetFieldId: string;
  operation: CalculationOperation;
  sourceFields: string[]; // supports "tableId.columnId" notation
}

// ---------------------------------------------------------------------------
// Schema definition (root of a dynamic form JSON)
// ---------------------------------------------------------------------------

export interface SchemaDefinition {
  fields: FieldDefinition[];
  conditionalRules?: ConditionalRule[];
  calculationRules?: CalculationRule[];
}
