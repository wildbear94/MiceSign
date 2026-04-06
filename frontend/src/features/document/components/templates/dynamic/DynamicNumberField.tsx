import type { UseFormRegister } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicNumberFieldProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  error?: string;
  isCalculated?: boolean;
  isConditionallyRequired?: boolean;
}

export default function DynamicNumberField({
  fieldDef,
  register,
  error,
  isCalculated,
  isConditionallyRequired,
}: DynamicNumberFieldProps) {
  const config = fieldDef.config;

  return (
    <DynamicFieldWrapper
      label={fieldDef.label}
      required={fieldDef.required}
      error={error}
      htmlFor={fieldDef.id}
      isConditionallyRequired={isConditionallyRequired}
      labelExtra={
        isCalculated ? (
          <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-1 rounded">
            자동 계산
          </span>
        ) : undefined
      }
    >
      <div className="flex items-center gap-2">
        <input
          id={fieldDef.id}
          type="number"
          {...register(fieldDef.id, { valueAsNumber: true })}
          min={config?.min}
          max={config?.max}
          placeholder={config?.placeholder}
          readOnly={isCalculated}
          aria-readonly={isCalculated || undefined}
          className={`w-full h-11 px-4 text-right border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-50 ${
            isCalculated
              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
              : 'bg-white dark:bg-gray-900'
          }`}
        />
        {config?.unit && (
          <span className="text-sm text-gray-500 ml-2 shrink-0">{config.unit}</span>
        )}
      </div>
    </DynamicFieldWrapper>
  );
}
