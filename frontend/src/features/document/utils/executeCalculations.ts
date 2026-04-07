import type { CalculationRule, FieldDefinition } from '../types/dynamicForm';

// ---------------------------------------------------------------------------
// Resolve a field reference to an array of numeric values.
// Supports "tableId.columnId" notation for table columns.
// ---------------------------------------------------------------------------

function resolveValue(
  fieldRef: string,
  formValues: Record<string, unknown>,
): number[] {
  // Table column reference: "tableId.columnId"
  if (fieldRef.includes('.')) {
    const [tableId, columnId] = fieldRef.split('.');
    const tableData = formValues[tableId];
    if (Array.isArray(tableData)) {
      return tableData.map((row) => {
        const val = (row as Record<string, unknown>)?.[columnId];
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      });
    }
    return [0];
  }

  // Plain field reference
  const val = formValues[fieldRef];

  // If the value is an array (e.g. table without column), sum each entry
  if (Array.isArray(val)) {
    return val.map((item) => {
      const num = Number(item);
      return isNaN(num) ? 0 : num;
    });
  }

  const num = Number(val);
  return [isNaN(num) ? 0 : num];
}

// ---------------------------------------------------------------------------
// Public API: execute a single calculation rule
// ---------------------------------------------------------------------------

/**
 * Execute one CalculationRule against current form values and return
 * the computed numeric result.
 */
export function executeCalculation(
  rule: CalculationRule,
  formValues: Record<string, unknown>,
): number {
  const allValues = rule.sourceFields.flatMap((field) =>
    resolveValue(field, formValues),
  );

  switch (rule.operation) {
    case 'SUM':
    case 'ADD':
      return allValues.reduce((acc, v) => acc + v, 0);

    case 'MULTIPLY':
      if (allValues.length === 0) return 0;
      return allValues.reduce((acc, v) => acc * v, 1);

    case 'COUNT':
      return rule.sourceFields.reduce((count, fieldRef) => {
        if (fieldRef.includes('.')) {
          const [tableId, columnId] = fieldRef.split('.');
          const tableData = formValues[tableId];
          if (Array.isArray(tableData)) {
            return (
              count +
              tableData.filter((row) => {
                const val = (row as Record<string, unknown>)?.[columnId];
                return val !== undefined && val !== null && val !== '';
              }).length
            );
          }
          return count;
        }
        const val = formValues[fieldRef];
        return val !== undefined && val !== null && val !== ''
          ? count + 1
          : count;
      }, 0);

    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Convenience: flatten nested fields
// ---------------------------------------------------------------------------

function flattenFields(fields: FieldDefinition[]): FieldDefinition[] {
  const result: FieldDefinition[] = [];
  for (const field of fields) {
    result.push(field);
    if (field.type === 'section' && field.children) {
      result.push(...flattenFields(field.children));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API: execute all calculations from field definitions
// ---------------------------------------------------------------------------

/**
 * Walk all fields, find those with a `calculation` config, and compute
 * their values. Returns a map of fieldId -> computed number.
 *
 * Useful for hardcoded template forms that embed CalculationConfig
 * inline on FieldDefinition rather than using top-level CalculationRule[].
 */
export function executeCalculations(
  fields: FieldDefinition[],
  formData: Record<string, unknown>,
): Record<string, number> {
  const results: Record<string, number> = {};

  for (const field of flattenFields(fields)) {
    if (!field.calculation) continue;

    const rule: CalculationRule = {
      targetFieldId: field.id,
      operation: field.calculation.operation,
      sourceFields: field.calculation.sourceFields,
    };

    results[field.id] = executeCalculation(rule, formData);
  }

  return results;
}
