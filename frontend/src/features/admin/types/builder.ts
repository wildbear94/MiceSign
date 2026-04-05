import type { FieldType, FieldDefinition, FieldConfig, SchemaDefinition } from '../../document/types/dynamicForm';

// Re-export for convenience
export type { FieldType, FieldDefinition, FieldConfig, SchemaDefinition };

// --- Admin Template API Response Types ---

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

// --- Builder State Types ---

export interface TemplateSettings {
  name: string;
  prefix: string;
  description: string;
  category: string;
  icon: string;
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

// --- Option Set Types ---

export interface OptionSetResponse {
  id: number;
  name: string;
  description?: string;
  items: {
    id: number;
    value: string;
    label: string;
    sortOrder: number;
  }[];
}

// --- Field Palette ---

export interface PaletteItem {
  type: FieldType;
  labelKey: string;
  icon: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'text', labelKey: 'palette.text', icon: 'Type' },
  { type: 'textarea', labelKey: 'palette.textarea', icon: 'AlignLeft' },
  { type: 'number', labelKey: 'palette.number', icon: 'Hash' },
  { type: 'date', labelKey: 'palette.date', icon: 'Calendar' },
  { type: 'select', labelKey: 'palette.select', icon: 'ChevronDown' },
  { type: 'table', labelKey: 'palette.table', icon: 'Table' },
  { type: 'staticText', labelKey: 'palette.staticText', icon: 'FileText' },
  { type: 'hidden', labelKey: 'palette.hidden', icon: 'EyeOff' },
];

// --- Field Type Defaults ---

export const FIELD_TYPE_DEFAULTS: Record<FieldType, Omit<FieldDefinition, 'id'>> = {
  text: {
    type: 'text',
    label: '텍스트 필드',
    required: false,
    config: { placeholder: '', maxLength: 200 },
  },
  textarea: {
    type: 'textarea',
    label: '텍스트 영역',
    required: false,
    config: { placeholder: '', maxLength: 2000 },
  },
  number: {
    type: 'number',
    label: '숫자 필드',
    required: false,
    config: { min: 0, max: 999999999, unit: '' },
  },
  date: {
    type: 'date',
    label: '날짜 필드',
    required: false,
    config: {},
  },
  select: {
    type: 'select',
    label: '선택 필드',
    required: false,
    config: { options: [] },
  },
  table: {
    type: 'table',
    label: '테이블',
    required: false,
    config: { minRows: 1, maxRows: 20, columns: [] },
  },
  staticText: {
    type: 'staticText',
    label: '안내 텍스트',
    required: false,
    config: { content: '' },
  },
  hidden: {
    type: 'hidden',
    label: '숨김 필드',
    required: false,
    config: { defaultValue: '' },
  },
};
