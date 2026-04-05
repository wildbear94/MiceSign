import { useFieldArray, type Control, type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import type { FieldDefinition } from '../../../types/dynamicForm';
import { buildDefaultRow } from '../../../utils/schemaToZod';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicTableFieldProps {
  fieldDef: FieldDefinition;
  control: Control<Record<string, unknown>>;
  register: UseFormRegister<Record<string, unknown>>;
  errors?: FieldErrors;
}

export default function DynamicTableField({
  fieldDef,
  control,
  register,
  errors,
}: DynamicTableFieldProps) {
  const columns = fieldDef.config?.columns ?? [];
  const minRows = fieldDef.config?.minRows ?? (fieldDef.required ? 1 : 0);
  const maxRows = fieldDef.config?.maxRows ?? 100;

  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldDef.id,
  });

  // Get table-level error (e.g., min/max rows)
  const tableError = errors?.[fieldDef.id];
  const tableErrorMessage =
    tableError && 'message' in tableError
      ? (tableError.message as string)
      : undefined;

  // Get row-level errors
  const rowErrors = (errors?.[fieldDef.id] as Record<string, Record<string, { message?: string }>> | undefined);

  return (
    <DynamicFieldWrapper
      label={fieldDef.label}
      required={fieldDef.required}
      error={tableErrorMessage}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-3 py-2"
                >
                  {col.label}
                  {col.required && <span className="text-red-500 ml-0.5">*</span>}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, rowIndex) => (
              <tr key={field.id} className="border-b border-gray-200 dark:border-gray-700">
                {columns.map((col) => {
                  const cellError = rowErrors?.[rowIndex]?.[col.id]?.message;
                  const isNumber = col.type === 'number';
                  return (
                    <td key={col.id} className="px-2 py-1.5">
                      <input
                        type={isNumber ? 'number' : 'text'}
                        {...register(
                          `${fieldDef.id}.${rowIndex}.${col.id}`,
                          isNumber ? { valueAsNumber: true } : undefined,
                        )}
                        placeholder={col.config?.placeholder}
                        className={`h-9 px-2 rounded text-sm border w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 ${
                          cellError
                            ? 'border-red-400 focus:ring-red-500'
                            : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
                        } focus:ring-1 focus:outline-none ${isNumber ? 'text-right' : ''}`}
                      />
                      {cellError && (
                        <p className="text-xs text-red-600 mt-0.5">{cellError}</p>
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => remove(rowIndex)}
                    disabled={fields.length <= minRows}
                    aria-label="행 삭제"
                    className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fields.length < maxRows && (
        <button
          type="button"
          onClick={() => append(buildDefaultRow(columns))}
          className="mt-2 text-blue-500 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          행 추가
        </button>
      )}
    </DynamicFieldWrapper>
  );
}
