import type React from 'react';
import { Type, AlignLeft, Hash, Calendar, List, FileText, EyeOff, Table, HelpCircle, CheckSquare } from 'lucide-react';
import type { SchemaFieldType, TableColumnType, ComparisonOperator, ActionOption } from './types';

export const FIELD_TYPE_META: Record<
  SchemaFieldType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  text: { icon: Type, color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  textarea: { icon: AlignLeft, color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40' },
  number: { icon: Hash, color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/40' },
  date: { icon: Calendar, color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
  select: { icon: List, color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  staticText: { icon: FileText, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  hidden: { icon: EyeOff, color: 'text-rose-700 dark:text-rose-300', bgColor: 'bg-rose-100 dark:bg-rose-900/40' },
  table: { icon: Table, color: 'text-teal-700 dark:text-teal-300', bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
};

export const FALLBACK_TYPE_META = { icon: HelpCircle, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700' };

export const FIELD_TYPES: SchemaFieldType[] = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'staticText',
  'hidden',
  'table',
];

export const COLUMN_TYPES: TableColumnType[] = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'checkbox',
  'staticText',
];

export const COLUMN_TYPE_META: Record<
  TableColumnType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  text: FIELD_TYPE_META.text,
  textarea: FIELD_TYPE_META.textarea,
  number: FIELD_TYPE_META.number,
  date: FIELD_TYPE_META.date,
  select: FIELD_TYPE_META.select,
  checkbox: { icon: CheckSquare, color: 'text-cyan-700 dark:text-cyan-300', bgColor: 'bg-cyan-100 dark:bg-cyan-900/40' },
  staticText: FIELD_TYPE_META.staticText,
};

export const INPUT_CLASS =
  'w-full h-11 px-4 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors border-gray-300 dark:border-gray-600';

export const SMALL_INPUT_CLASS =
  'w-full h-9 px-3 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors border-gray-300 dark:border-gray-600';

// === Conditional Rule Constants ===

// D-05: Source field allowed types
export const CONDITION_SOURCE_TYPES: SchemaFieldType[] = ['text', 'number', 'date', 'select'];

// D-04: Target field excluded types
export const CONDITION_EXCLUDED_TARGET_TYPES: SchemaFieldType[] = ['staticText', 'hidden'];

// D-08: Operators by source field type
export const OPERATORS_BY_TYPE: Record<string, ComparisonOperator[]> = {
  text:   ['eq', 'neq', 'isEmpty', 'isNotEmpty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  date:   ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'],
  select: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
};

// D-09: Action options
export const ACTION_OPTIONS: ActionOption[] = [
  { value: 'show', labelKey: 'templates.condition.actions.show' },
  { value: 'hide', labelKey: 'templates.condition.actions.hide' },
  { value: 'require', labelKey: 'templates.condition.actions.require' },
  { value: 'unrequire', labelKey: 'templates.condition.actions.unrequire' },
];
