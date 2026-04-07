import { useReducer } from 'react';
import type { FieldDefinition, FieldType, FieldConfig } from '../../../document/types/dynamicForm';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface BuilderState {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  isDirty: boolean;
  isPreview: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type BuilderAction =
  | { type: 'ADD_FIELD'; field: FieldDefinition }
  | { type: 'INSERT_FIELD'; field: FieldDefinition; index: number }
  | { type: 'REMOVE_FIELD'; fieldId: string }
  | { type: 'UPDATE_FIELD'; fieldId: string; updates: Partial<FieldDefinition> }
  | { type: 'REORDER_FIELDS'; sourceIndex: number; destIndex: number }
  | { type: 'SELECT_FIELD'; fieldId: string | null }
  | { type: 'SET_PREVIEW'; isPreview: boolean }
  | { type: 'LOAD_SCHEMA'; fields: FieldDefinition[] }
  | { type: 'MARK_SAVED' }
  | { type: 'ADD_FIELD_TO_SECTION'; sectionId: string; field: FieldDefinition }
  | { type: 'MOVE_FIELD_TO_SECTION'; fieldId: string; sectionId: string; index: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultConfig(fieldType: FieldType): FieldConfig {
  switch (fieldType) {
    case 'text':
      return { maxLength: 200 };
    case 'textarea':
      return { maxLength: 2000, rows: 4 };
    case 'number':
      return {};
    case 'date':
      return {};
    case 'select':
      return { options: [] };
    case 'table':
      return { columns: [], minRows: 1, maxRows: 20 };
    case 'staticText':
      return { content: '' };
    case 'hidden':
      return {};
    case 'section':
      return {};
    default:
      return {};
  }
}

function getDefaultLabel(fieldType: FieldType): string {
  const labels: Record<FieldType, string> = {
    text: '텍스트 필드',
    textarea: '장문 텍스트',
    number: '숫자 필드',
    date: '날짜 필드',
    select: '선택 필드',
    table: '테이블',
    staticText: '안내 문구',
    hidden: '숨김 필드',
    section: '섹션',
  };
  return labels[fieldType] ?? fieldType;
}

export function createField(fieldType: FieldType): FieldDefinition {
  return {
    id: crypto.randomUUID(),
    type: fieldType,
    label: getDefaultLabel(fieldType),
    required: false,
    width: 'full',
    config: getDefaultConfig(fieldType),
    children: fieldType === 'section' ? [] : undefined,
  };
}

/** Remove a field from the top-level or from within sections. */
function removeFieldRecursive(
  fields: FieldDefinition[],
  fieldId: string,
): FieldDefinition[] {
  return fields
    .filter((f) => f.id !== fieldId)
    .map((f) =>
      f.type === 'section' && f.children
        ? { ...f, children: removeFieldRecursive(f.children, fieldId) }
        : f,
    );
}

/** Update a field at any nesting level. */
function updateFieldRecursive(
  fields: FieldDefinition[],
  fieldId: string,
  updates: Partial<FieldDefinition>,
): FieldDefinition[] {
  return fields.map((f) => {
    if (f.id === fieldId) return { ...f, ...updates };
    if (f.type === 'section' && f.children) {
      return { ...f, children: updateFieldRecursive(f.children, fieldId, updates) };
    }
    return f;
  });
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const initialState: BuilderState = {
  fields: [],
  selectedFieldId: null,
  isDirty: false,
  isPreview: false,
};

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'ADD_FIELD': {
      return {
        ...state,
        fields: [...state.fields, action.field],
        selectedFieldId: action.field.id,
        isDirty: true,
      };
    }

    case 'INSERT_FIELD': {
      const fields = [...state.fields];
      fields.splice(action.index, 0, action.field);
      return {
        ...state,
        fields,
        selectedFieldId: action.field.id,
        isDirty: true,
      };
    }

    case 'REMOVE_FIELD': {
      return {
        ...state,
        fields: removeFieldRecursive(state.fields, action.fieldId),
        selectedFieldId:
          state.selectedFieldId === action.fieldId ? null : state.selectedFieldId,
        isDirty: true,
      };
    }

    case 'UPDATE_FIELD': {
      return {
        ...state,
        fields: updateFieldRecursive(state.fields, action.fieldId, action.updates),
        isDirty: true,
      };
    }

    case 'REORDER_FIELDS': {
      const { sourceIndex, destIndex } = action;
      const fields = [...state.fields];
      const [moved] = fields.splice(sourceIndex, 1);
      fields.splice(destIndex, 0, moved);
      return { ...state, fields, isDirty: true };
    }

    case 'SELECT_FIELD':
      return { ...state, selectedFieldId: action.fieldId };

    case 'SET_PREVIEW':
      return { ...state, isPreview: action.isPreview };

    case 'LOAD_SCHEMA':
      return {
        ...state,
        fields: action.fields,
        selectedFieldId: null,
        isDirty: false,
        isPreview: false,
      };

    case 'MARK_SAVED':
      return { ...state, isDirty: false };

    case 'ADD_FIELD_TO_SECTION': {
      const { sectionId, field } = action;
      return {
        ...state,
        fields: state.fields.map((f) =>
          f.id === sectionId && f.type === 'section'
            ? { ...f, children: [...(f.children ?? []), field] }
            : f,
        ),
        selectedFieldId: field.id,
        isDirty: true,
      };
    }

    case 'MOVE_FIELD_TO_SECTION': {
      const { fieldId, sectionId, index } = action;
      // First remove from everywhere
      let movingField: FieldDefinition | null = null;
      const findAndRemove = (fields: FieldDefinition[]): FieldDefinition[] =>
        fields
          .filter((f) => {
            if (f.id === fieldId) {
              movingField = f;
              return false;
            }
            return true;
          })
          .map((f) =>
            f.type === 'section' && f.children
              ? { ...f, children: findAndRemove(f.children) }
              : f,
          );

      const cleaned = findAndRemove(state.fields);
      if (!movingField) return state;

      // Insert into target section
      const fields = cleaned.map((f) => {
        if (f.id === sectionId && f.type === 'section') {
          const children = [...(f.children ?? [])];
          children.splice(index, 0, movingField!);
          return { ...f, children };
        }
        return f;
      });

      return { ...state, fields, isDirty: true };
    }

    default:
      return state;
  }
}

export function useBuilderReducer(initialFields?: FieldDefinition[]) {
  return useReducer(builderReducer, {
    ...initialState,
    fields: initialFields ?? [],
  });
}
