import type { ConditionalRule } from '../../../document/types/dynamicForm';
import type { SchemaField } from './types';
import { CONDITION_SOURCE_TYPES } from './constants';

/**
 * D-21, D-22: Cleanup rules when a field is deleted.
 * Bidirectional: removes rules where deleted field is either target or source.
 * @returns [cleaned rules array, number of removed rules]
 */
export function cleanupRulesForDeletedField(
  deletedFieldId: string,
  rules: ConditionalRule[],
): [ConditionalRule[], number] {
  const before = rules.length;
  const cleaned = rules.filter(
    r => r.targetFieldId !== deletedFieldId && r.condition.fieldId !== deletedFieldId
  );
  return [cleaned, before - cleaned.length];
}

/**
 * D-25: Cleanup rules when a source field's type changes.
 * If new type is not a valid source type, remove rules referencing it as source.
 * If new type is staticText/hidden (D-04), remove rules targeting it.
 */
export function cleanupRulesForTypeChange(
  changedFieldId: string,
  newType: string,
  rules: ConditionalRule[],
): [ConditionalRule[], number] {
  const before = rules.length;
  let cleaned = [...rules];

  // Remove rules where this field is used as source if new type is not a valid source type
  if (!CONDITION_SOURCE_TYPES.includes(newType as any)) {
    cleaned = cleaned.filter(r => r.condition.fieldId !== changedFieldId);
  }

  // Remove rules targeting this field if new type is not a valid target type (D-04)
  if (['staticText', 'hidden'].includes(newType)) {
    cleaned = cleaned.filter(r => r.targetFieldId !== changedFieldId);
  }

  return [cleaned, before - cleaned.length];
}

/**
 * D-12, D-13: Get available source fields for a given target field.
 * Filters out:
 * 1. The target field itself (self-reference prevention)
 * 2. Fields whose type is not in CONDITION_SOURCE_TYPES
 * 3. Fields that would create circular references
 */
export function getAvailableSourceFields(
  targetFieldId: string,
  allFields: SchemaField[],
  rules: ConditionalRule[],
): SchemaField[] {
  // Fields that use targetFieldId as their source -> their targetFieldIds would create a cycle
  const fieldsTargetingMe = rules
    .filter(r => r.condition.fieldId === targetFieldId)
    .map(r => r.targetFieldId);

  return allFields.filter(f =>
    f.id !== targetFieldId &&
    CONDITION_SOURCE_TYPES.includes(f.type as any) &&
    !fieldsTargetingMe.includes(f.id)
  );
}
