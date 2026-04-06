import type { UseFormRegister } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicTextFieldProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  error?: string;
  isConditionallyRequired?: boolean;
}

export default function DynamicTextField({
  fieldDef,
  register,
  error,
  isConditionallyRequired,
}: DynamicTextFieldProps) {
  return (
    <DynamicFieldWrapper
      label={fieldDef.label}
      required={fieldDef.required}
      error={error}
      htmlFor={fieldDef.id}
      isConditionallyRequired={isConditionallyRequired}
    >
      <input
        id={fieldDef.id}
        type="text"
        {...register(fieldDef.id)}
        placeholder={fieldDef.config?.placeholder}
        maxLength={fieldDef.config?.maxLength}
        className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
      />
    </DynamicFieldWrapper>
  );
}
