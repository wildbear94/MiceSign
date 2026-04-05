import type { UseFormRegister } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicNumberFieldProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  error?: string;
}

export default function DynamicNumberField({
  fieldDef,
  register,
  error,
}: DynamicNumberFieldProps) {
  const config = fieldDef.config;

  return (
    <DynamicFieldWrapper
      label={fieldDef.label}
      required={fieldDef.required}
      error={error}
      htmlFor={fieldDef.id}
    >
      <div className="flex items-center gap-2">
        <input
          id={fieldDef.id}
          type="number"
          {...register(fieldDef.id, { valueAsNumber: true })}
          min={config?.min}
          max={config?.max}
          placeholder={config?.placeholder}
          className="w-full h-11 px-4 text-right border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {config?.unit && (
          <span className="text-sm text-gray-500 ml-2 shrink-0">{config.unit}</span>
        )}
      </div>
    </DynamicFieldWrapper>
  );
}
