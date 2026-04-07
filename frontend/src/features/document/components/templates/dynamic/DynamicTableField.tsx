import { useFieldArray, type Control, type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicTableFieldProps {
  fieldDef: FieldDefinition;
  control: Control<Record<string, unknown>>;
  register: UseFormRegister<Record<string, unknown>>;
  errors?: FieldErrors;
  isReadOnly?: boolean;
}

export default function DynamicTableField({
  fieldDef,
  control,
  register,
  errors,
  isReadOnly = false,
}: DynamicTableFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldDef.id,
  });

  const columns = fieldDef.config?.columns ?? [];
  const minRows = fieldDef.config?.minRows ?? 0;
  const maxRows = fieldDef.config?.maxRows;

  const tableError = errors?.[fieldDef.id];
  const errorMessage =
    tableError && typeof tableError === 'object' && 'message' in tableError
      ? String(tableError.message)
      : undefined;

  const handleAddRow = () => {
    if (maxRows && fields.length >= maxRows) return;
    const emptyRow: Record<string, string | number> = {};
    for (const col of columns) {
      emptyRow[col.id] = col.type === 'number' ? 0 : '';
    }
    append(emptyRow);
  };

  const handleRemoveRow = (index: number) => {
    if (fields.length <= minRows) return;
    remove(index);
  };

  return (
    <DynamicFieldWrapper fieldDef={fieldDef} error={errorMessage}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={col.width ? { width: col.width } : undefined}
                  className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300"
                >
                  {col.label}
                  {col.required && <span className="text-red-500 ml-0.5">*</span>}
                </th>
              ))}
              {!isReadOnly && (
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 w-10" />
              )}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, rowIndex) => (
              <tr key={field.id}>
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="border border-gray-300 dark:border-gray-600 px-1 py-1"
                  >
                    {col.type === 'select' ? (
                      <select
                        {...register(`${fieldDef.id}.${rowIndex}.${col.id}`)}
                        disabled={isReadOnly}
                        className="w-full rounded px-2 py-1 text-sm border-0
                          focus:ring-1 focus:ring-blue-500
                          dark:bg-gray-700 dark:text-white
                          disabled:bg-gray-50 disabled:dark:bg-gray-800"
                      >
                        <option value="">선택</option>
                        {(col.options ?? []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                        {...register(
                          `${fieldDef.id}.${rowIndex}.${col.id}`,
                          col.type === 'number' ? { valueAsNumber: true } : undefined,
                        )}
                        readOnly={isReadOnly}
                        className="w-full rounded px-2 py-1 text-sm border-0
                          focus:ring-1 focus:ring-blue-500
                          dark:bg-gray-700 dark:text-white
                          read-only:bg-gray-50 read-only:dark:bg-gray-800"
                      />
                    )}
                  </td>
                ))}
                {!isReadOnly && (
                  <td className="border border-gray-300 dark:border-gray-600 px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(rowIndex)}
                      disabled={fields.length <= minRows}
                      className="text-gray-400 hover:text-red-500 disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isReadOnly && (
        <button
          type="button"
          onClick={handleAddRow}
          disabled={maxRows !== undefined && fields.length >= maxRows}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          행 추가
        </button>
      )}
    </DynamicFieldWrapper>
  );
}
