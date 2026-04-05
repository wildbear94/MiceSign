export interface AdminTemplateResponse {
  id: number;
  name: string;
  prefix: string;
  description?: string;
  category?: string;
  icon?: string;
  isActive: boolean;
  isBuiltIn: boolean;
  schemaVersion: number;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTemplateDetailResponse extends AdminTemplateResponse {
  schemaDefinition?: SchemaDefinition;
}

export interface CreateTemplateRequest {
  name: string;
  prefix: string;
  description?: string;
  category?: string;
  icon?: string;
  schemaDefinition?: SchemaDefinition;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  schemaDefinition?: SchemaDefinition;
}

export interface TemplateSettings {
  name: string;
  prefix: string;
  description: string;
  category: string;
  icon: string;
}

export interface FieldConfig {
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  unit?: string;
  optionSetId?: number;
  options?: OptionItem[];
  minRows?: number;
  maxRows?: number;
  columns?: FieldDefinition[];
  content?: string;
  defaultValue?: string;
  width?: 'full' | 'half';
}

export interface OptionItem {
  value: string;
  label: string;
}

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'table' | 'staticText' | 'hidden';

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

export interface BuilderState {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  templateSettings: TemplateSettings;
  isDirty: boolean;
  schemaVersion: number;
}

export type BuilderAction =
  | { type: 'INIT_SCHEMA'; schema: SchemaDefinition; settings: TemplateSettings }
  | { type: 'ADD_FIELD'; fieldType: FieldType; insertIndex: number }
  | { type: 'REMOVE_FIELD'; fieldId: string }
  | { type: 'DUPLICATE_FIELD'; fieldId: string }
  | { type: 'REORDER_FIELD'; fromIndex: number; toIndex: number }
  | { type: 'SELECT_FIELD'; fieldId: string | null }
  | { type: 'UPDATE_FIELD'; fieldId: string; changes: Partial<FieldDefinition> }
  | { type: 'UPDATE_FIELD_CONFIG'; fieldId: string; config: Partial<FieldConfig> }
  | { type: 'UPDATE_TEMPLATE_SETTINGS'; changes: Partial<TemplateSettings> }
  | { type: 'IMPORT_SCHEMA'; schema: SchemaDefinition }
  | { type: 'MARK_SAVED' };

export interface OptionSetResponse {
  id: number;
  name: string;
  description?: string;
  items: { id: number; value: string; label: string; sortOrder: number }[];
}

export const PALETTE_ITEMS: { type: FieldType; labelKey: string; icon: string }[] = [
  { type: 'text', labelKey: 'text', icon: 'Type' },
  { type: 'textarea', labelKey: 'textarea', icon: 'AlignLeft' },
  { type: 'number', labelKey: 'number', icon: 'Hash' },
  { type: 'date', labelKey: 'date', icon: 'Calendar' },
  { type: 'select', labelKey: 'select', icon: 'ChevronDown' },
  { type: 'table', labelKey: 'table', icon: 'Table' },
  { type: 'staticText', labelKey: 'staticText', icon: 'FileText' },
  { type: 'hidden', labelKey: 'hidden', icon: 'EyeOff' },
];

export const FIELD_TYPE_DEFAULTS: Record<FieldType, Omit<FieldDefinition, 'id'>> = {
  text: { type: 'text', label: '텍스트 필드', required: false, config: { placeholder: '' } },
  textarea: { type: 'textarea', label: '텍스트 영역', required: false, config: { minRows: 3, maxRows: 10 } },
  number: { type: 'number', label: '숫자 필드', required: false, config: { min: 0 } },
  date: { type: 'date', label: '날짜 필드', required: false, config: {} },
  select: { type: 'select', label: '선택 필드', required: false, config: { options: [] } },
  table: { type: 'table', label: '테이블', required: false, config: { columns: [] } },
  staticText: { type: 'staticText', label: '안내 텍스트', required: false, config: { content: '' } },
  hidden: { type: 'hidden', label: '숨김 필드', required: false, config: { defaultValue: '' } },
};
