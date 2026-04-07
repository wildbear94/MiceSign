import type { UseFormRegister } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicNumberFieldProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  error?: string;
  isReadOnly?: boolean;
}

export default function DynamicNumberField({
  fieldDef,
  register,
  error,
  isReadOnly = false,
}: DynamicNumberFieldProps) {
  return (
    <DynamicFieldWrapper fieldDef={fieldDef} error={error}>
      <input
        type="number"
        {...register(fieldDef.id, { valueAsNumber: true })}
        min={fieldDef.config?.min}
        max={fieldDef.config?.max}
        placeholder={fieldDef.placeholder}
        readOnly={isReadOnly}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          dark:border-gray-600 dark:bg-gray-700 dark:text-white
          read-only:bg-gray-50 read-only:dark:bg-gray-800"
      />
    </DynamicFieldWrapper>
  );
}
