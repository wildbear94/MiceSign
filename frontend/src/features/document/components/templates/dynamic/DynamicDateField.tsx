import type { UseFormRegister } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicDateFieldProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  error?: string;
  isReadOnly?: boolean;
}

export default function DynamicDateField({
  fieldDef,
  register,
  error,
  isReadOnly = false,
}: DynamicDateFieldProps) {
  return (
    <DynamicFieldWrapper fieldDef={fieldDef} error={error}>
      <input
        type="date"
        {...register(fieldDef.id)}
        readOnly={isReadOnly}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          dark:border-gray-600 dark:bg-gray-700 dark:text-white
          read-only:bg-gray-50 read-only:dark:bg-gray-800"
      />
    </DynamicFieldWrapper>
  );
}
