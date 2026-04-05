import { useReducer } from 'react';
import { nanoid } from 'nanoid';
import type { BuilderState, BuilderAction } from '../../types/builder';
import { FIELD_TYPE_DEFAULTS } from '../../types/builder';
import type { FieldDefinition } from '../../../document/types/dynamicForm';

const initialState: BuilderState = {
  fields: [],
  selectedFieldId: null,
  templateSettings: {
    name: '',
    prefix: '',
    description: '',
    category: '',
    icon: '',
  },
  isDirty: false,
  schemaVersion: 1,
};

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'INIT_SCHEMA':
      return {
        ...state,
        fields: action.schema.fields,
        schemaVersion: action.schema.version,
        templateSettings: action.settings,
        isDirty: false,
        selectedFieldId: null,
      };

    case 'ADD_FIELD': {
      const defaults = FIELD_TYPE_DEFAULTS[action.fieldType];
      const newField: FieldDefinition = {
        ...defaults,
        id: nanoid(),
        config: defaults.config ? { ...defaults.config } : undefined,
      };
      const newFields = [...state.fields];
      newFields.splice(action.insertIndex, 0, newField);
      return {
        ...state,
        fields: newFields,
        isDirty: true,
      };
    }

    case 'REMOVE_FIELD': {
      const filtered = state.fields.filter((f) => f.id !== action.fieldId);
      return {
        ...state,
        fields: filtered,
        selectedFieldId: state.selectedFieldId === action.fieldId ? null : state.selectedFieldId,
        isDirty: true,
      };
    }

    case 'DUPLICATE_FIELD': {
      const sourceIndex = state.fields.findIndex((f) => f.id === action.fieldId);
      if (sourceIndex === -1) return state;
      const source = state.fields[sourceIndex];
      const duplicated: FieldDefinition = {
        ...source,
        id: nanoid(),
        label: source.label + ' (복사본)',
        config: source.config ? { ...source.config } : undefined,
      };
      const newFields = [...state.fields];
      newFields.splice(sourceIndex + 1, 0, duplicated);
      return {
        ...state,
        fields: newFields,
        selectedFieldId: duplicated.id,
        isDirty: true,
      };
    }

    case 'REORDER_FIELD': {
      const newFields = [...state.fields];
      const [moved] = newFields.splice(action.fromIndex, 1);
      newFields.splice(action.toIndex, 0, moved);
      return {
        ...state,
        fields: newFields,
        isDirty: true,
      };
    }

    case 'SELECT_FIELD':
      return {
        ...state,
        selectedFieldId: action.fieldId,
      };

    case 'UPDATE_FIELD':
      return {
        ...state,
        fields: state.fields.map((f) =>
          f.id === action.fieldId ? { ...f, ...action.changes } : f,
        ),
        isDirty: true,
      };

    case 'UPDATE_FIELD_CONFIG':
      return {
        ...state,
        fields: state.fields.map((f) =>
          f.id === action.fieldId
            ? { ...f, config: { ...f.config, ...action.config } }
            : f,
        ),
        isDirty: true,
      };

    case 'UPDATE_TEMPLATE_SETTINGS':
      return {
        ...state,
        templateSettings: { ...state.templateSettings, ...action.changes },
        isDirty: true,
      };

    case 'IMPORT_SCHEMA':
      return {
        ...state,
        fields: action.schema.fields,
        schemaVersion: action.schema.version,
        isDirty: true,
        selectedFieldId: null,
      };

    case 'MARK_SAVED':
      return {
        ...state,
        isDirty: false,
      };

    default:
      return state;
  }
}

export function useBuilderReducer() {
  return useReducer(builderReducer, initialState);
}
