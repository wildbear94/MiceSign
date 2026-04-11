export type SchemaFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'staticText'
  | 'hidden'
  | 'table';

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
