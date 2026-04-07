import type { UseFormRegister } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';

interface DynamicHiddenFieldProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
}

export default function DynamicHiddenField({
  fieldDef,
  register,
}: DynamicHiddenFieldProps) {
  return (
    <input
      type="hidden"
      {...register(fieldDef.id)}
      defaultValue={
        fieldDef.defaultValue !== undefined
          ? String(fieldDef.defaultValue)
          : ''
      }
    />
  );
}
