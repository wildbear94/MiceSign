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
  conditionalRules: [],
  calculationRules: [],
};

/**
 * 필드 삭제 시 해당 필드를 참조하는 조건부/계산 규칙 정리
 */
function cleanupRulesForRemovedField(state: BuilderState, removedFieldId: string): Pick<BuilderState, 'conditionalRules' | 'calculationRules'> {
  const conditionalRules = state.conditionalRules
    .filter((rule) => {
      // 타겟 필드가 삭제된 경우 규칙 전체 제거
      if (rule.targetFieldId === removedFieldId) return false;
      // 소스 필드가 삭제된 조건이 있으면 해당 조건 제거
      const remainingConditions = rule.conditions.filter(
        (c) => c.sourceFieldId !== removedFieldId,
      );
      // 조건이 모두 제거되면 규칙도 제거
      return remainingConditions.length > 0;
    })
    .map((rule) => ({
      ...rule,
      conditions: rule.conditions.filter(
        (c) => c.sourceFieldId !== removedFieldId,
      ),
    }));

  const calculationRules = state.calculationRules
    .filter((rule) => {
      // 타겟 필드가 삭제된 경우 규칙 전체 제거
      if (rule.targetFieldId === removedFieldId) return false;
      // 소스 필드 중 삭제된 것 제거 후 남는 것이 있는지 확인
      const remainingSources = rule.sourceFields.filter(
        (sf) => {
          const fieldId = sf.includes('.') ? sf.split('.')[0] : sf;
          return fieldId !== removedFieldId;
        },
      );
      return remainingSources.length > 0;
    })
    .map((rule) => ({
      ...rule,
      sourceFields: rule.sourceFields.filter((sf) => {
        const fieldId = sf.includes('.') ? sf.split('.')[0] : sf;
        return fieldId !== removedFieldId;
      }),
    }));

  return { conditionalRules, calculationRules };
}

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'INIT_SCHEMA':
      return {
        ...state,
        fields: action.schema.fields,
        schemaVersion: action.schema.version,
        templateSettings: action.settings,
        conditionalRules: action.schema.conditionalRules ?? [],
        calculationRules: action.schema.calculationRules ?? [],
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
      const cleanedRules = cleanupRulesForRemovedField(state, action.fieldId);
      return {
        ...state,
        fields: filtered,
        selectedFieldId: state.selectedFieldId === action.fieldId ? null : state.selectedFieldId,
        ...cleanedRules,
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
        conditionalRules: action.schema.conditionalRules ?? [],
        calculationRules: action.schema.calculationRules ?? [],
        isDirty: true,
        selectedFieldId: null,
      };

    case 'MARK_SAVED':
      return {
        ...state,
        isDirty: false,
      };

    // 조건부 규칙 관리
    case 'SET_CONDITIONAL_RULES':
      return { ...state, conditionalRules: action.rules, isDirty: true };

    case 'ADD_CONDITIONAL_RULE':
      return { ...state, conditionalRules: [...state.conditionalRules, action.rule], isDirty: true };

    case 'UPDATE_CONDITIONAL_RULE': {
      const newRules = [...state.conditionalRules];
      newRules[action.index] = action.rule;
      return { ...state, conditionalRules: newRules, isDirty: true };
    }

    case 'REMOVE_CONDITIONAL_RULE': {
      const newRules = [...state.conditionalRules];
      newRules.splice(action.index, 1);
      return { ...state, conditionalRules: newRules, isDirty: true };
    }

    // 계산 규칙 관리
    case 'SET_CALCULATION_RULES':
      return { ...state, calculationRules: action.rules, isDirty: true };

    case 'ADD_CALCULATION_RULE':
      return { ...state, calculationRules: [...state.calculationRules, action.rule], isDirty: true };

    case 'UPDATE_CALCULATION_RULE': {
      const newRules = [...state.calculationRules];
      newRules[action.index] = action.rule;
      return { ...state, calculationRules: newRules, isDirty: true };
    }

    case 'REMOVE_CALCULATION_RULE': {
      const newRules = [...state.calculationRules];
      newRules.splice(action.index, 1);
      return { ...state, calculationRules: newRules, isDirty: true };
    }

    default:
      return state;
  }
}

export function useBuilderReducer() {
  return useReducer(builderReducer, initialState);
}
