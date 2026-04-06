import type { UseFormRegister } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicTextareaFieldProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  error?: string;
  isConditionallyRequired?: boolean;
}

export default function DynamicTextareaField({
  fieldDef,
  register,
  error,
  isConditionallyRequired,
}: DynamicTextareaFieldProps) {
  return (
    <DynamicFieldWrapper
      label={fieldDef.label}
      required={fieldDef.required}
      error={error}
      htmlFor={fieldDef.id}
      isConditionallyRequired={isConditionallyRequired}
    >
      <textarea
        id={fieldDef.id}
        {...register(fieldDef.id)}
        placeholder={fieldDef.config?.placeholder}
        maxLength={fieldDef.config?.maxLength}
        className="w-full min-h-[120px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 resize-y"
      />
    </DynamicFieldWrapper>
  );
}
