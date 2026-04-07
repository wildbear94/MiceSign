import type { FieldType, SchemaDefinition } from '../../document/types/dynamicForm';

// Re-export for convenience
export type { SchemaDefinition, FieldType };

// === Admin Template Types ===
export interface AdminTemplate {
  id: number;
  code: string;
  name: string;
  description: string | null;
  prefix: string;
  isActive: boolean;
  sortOrder: number;
  isCustom: boolean;
  category: string | null;
  icon: string | null;
  budgetEnabled: boolean;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTemplateDetail extends AdminTemplate {
  schemaDefinition: SchemaDefinition | null;
  createdBy: number | null;
}

export interface CreateTemplateRequest {
  name: string;
  prefix: string;
  description?: string;
  category?: string;
  icon?: string;
  schemaDefinition?: string; // JSON stringified SchemaDefinition
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  schemaDefinition?: string; // JSON stringified SchemaDefinition
}

// === Palette ===
export interface PaletteItem {
  type: FieldType;
  label: string;
  icon: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'text', label: '텍스트', icon: 'Type' },
  { type: 'textarea', label: '장문 텍스트', icon: 'AlignLeft' },
  { type: 'number', label: '숫자', icon: 'Hash' },
  { type: 'date', label: '날짜', icon: 'Calendar' },
  { type: 'select', label: '선택', icon: 'List' },
  { type: 'table', label: '테이블', icon: 'Table' },
  { type: 'staticText', label: '안내 문구', icon: 'FileText' },
  { type: 'hidden', label: '숨김 필드', icon: 'EyeOff' },
  { type: 'section', label: '섹션 구분', icon: 'Minus' },
];
