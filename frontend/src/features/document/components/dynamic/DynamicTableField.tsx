import {
  useFieldArray,
  useFormContext,
  type Control,
  type UseFormRegister,
} from 'react-hook-form';
import type { FieldDefinition, ColumnDefinition } from '../../types/dynamicForm';
import { buildDefaultRow } from '../../utils/schemaToZod';

/**
 * Phase 24.1-02 Task 2: 사용자측 동적 폼의 table 필드 렌더러.
 *
 * useFieldArray로 행 추가/삭제를 관리하고, 각 셀 입력은 부모의 FormProvider에서
 * 주입된 useFormContext().register 를 사용한다. (Plan 03 DynamicCustomForm 에서
 * <FormProvider> 로 감싸야 함.)
 */
interface DynamicTableFieldProps {
  field: FieldDefinition;
  control: Control<Record<string, unknown>>;
  disabled?: boolean;
}

type AnyRegister = UseFormRegister<Record<string, unknown>>;

export default function DynamicTableField({
  field,
  control,
  disabled,
}: DynamicTableFieldProps) {
  const columns: ColumnDefinition[] = field.config?.columns ?? [];

  // useFieldArray 의 name 시그니처가 dot-path 리터럴을 요구하므로 캐스팅이 필요하다.
  const { fields, append, remove } = useFieldArray({
    control: control as unknown as Control<Record<string, never[]>>,
    name: field.id as never,
  });

  const { register } = useFormContext<Record<string, unknown>>();

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {!disabled && (
          <button
            type="button"
            onClick={() => append(buildDefaultRow(columns) as never)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + 행 추가
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {col.label}
                  {col.required && <span className="text-red-500 ml-1">*</span>}
                </th>
              ))}
              {!disabled && (
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 w-16"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (disabled ? 0 : 1)}
                  className="border border-gray-300 dark:border-gray-600 px-3 py-4 text-center text-gray-500 text-sm"
                >
                  행이 없습니다. "행 추가" 버튼을 눌러 추가하세요.
                </td>
              </tr>
            )}
            {fields.map((row, rowIdx) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="border border-gray-300 dark:border-gray-600 px-2 py-1"
                  >
                    {renderCell(
                      col,
                      `${field.id}.${rowIdx}.${col.id}`,
                      register,
                      disabled,
                    )}
                  </td>
                ))}
                {!disabled && (
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => remove(rowIdx)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      aria-label={`행 ${rowIdx + 1} 삭제`}
                    >
                      삭제
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderCell(
  col: ColumnDefinition,
  name: string,
  register: AnyRegister,
  disabled?: boolean,
) {
  const cellCls =
    'w-full border-0 px-2 py-1 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500';

  switch (col.type) {
    case 'number':
      return (
        <input
          type="number"
          disabled={disabled}
          className={cellCls}
          placeholder={col.config?.placeholder ?? ''}
          {...register(name, { valueAsNumber: true })}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          disabled={disabled}
          className={cellCls}
          {...register(name)}
        />
      );
    case 'select':
      return (
        <select disabled={disabled} className={cellCls} {...register(name)}>
          <option value="">선택</option>
          {(col.config?.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label || opt.value}
            </option>
          ))}
        </select>
      );
    case 'textarea':
      return (
        <textarea
          disabled={disabled}
          rows={1}
          className={cellCls}
          placeholder={col.config?.placeholder ?? ''}
          {...register(name)}
        />
      );
    case 'staticText':
      return (
        <span className="text-xs text-gray-500">
          {col.config?.content ?? '-'}
        </span>
      );
    case 'hidden':
      return <input type="hidden" {...register(name)} />;
    case 'text':
    default:
      return (
        <input
          type="text"
          disabled={disabled}
          className={cellCls}
          placeholder={col.config?.placeholder ?? ''}
          {...register(name)}
        />
      );
  }
}
