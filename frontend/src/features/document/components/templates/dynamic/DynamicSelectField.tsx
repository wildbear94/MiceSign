import { useState, useEffect } from 'react';
import type { UseFormRegister } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicSelectFieldProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  error?: string;
  isReadOnly?: boolean;
}

export default function DynamicSelectField({
  fieldDef,
  register,
  error,
  isReadOnly = false,
}: DynamicSelectFieldProps) {
  const [options, setOptions] = useState(fieldDef.config?.options ?? []);

  // If optionSetId is provided, resolve options via API
  useEffect(() => {
    if (fieldDef.config?.optionSetId) {
      // TODO: Resolve optionSetId via API when backend supports it
      // For now, fall back to inline options
    }
  }, [fieldDef.config?.optionSetId]);

  return (
    <DynamicFieldWrapper fieldDef={fieldDef} error={error}>
      <select
        {...register(fieldDef.id)}
        disabled={isReadOnly}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          dark:border-gray-600 dark:bg-gray-700 dark:text-white
          disabled:bg-gray-50 disabled:dark:bg-gray-800"
      >
        <option value="">{fieldDef.placeholder ?? '선택하세요'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </DynamicFieldWrapper>
  );
}
