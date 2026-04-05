import { useEffect } from 'react';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';

interface DynamicHiddenFieldProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
}

export default function DynamicHiddenField({
  fieldDef,
  register,
  setValue,
}: DynamicHiddenFieldProps) {
  const defaultValue = fieldDef.config?.defaultValue ?? '';

  useEffect(() => {
    setValue(fieldDef.id, defaultValue);
  }, [fieldDef.id, defaultValue, setValue]);

  return <input type="hidden" {...register(fieldDef.id)} />;
}
