import type { Control, UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicTextField from './DynamicTextField';
import DynamicTextareaField from './DynamicTextareaField';
import DynamicNumberField from './DynamicNumberField';
import DynamicDateField from './DynamicDateField';
import DynamicSelectField from './DynamicSelectField';
import DynamicTableField from './DynamicTableField';
import DynamicStaticText from './DynamicStaticText';
import DynamicHiddenField from './DynamicHiddenField';

interface DynamicFieldRendererProps {
  fieldDef: FieldDefinition;
  control: Control<Record<string, unknown>>;
  register: UseFormRegister<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  errors: FieldErrors;
}

export default function DynamicFieldRenderer({
  fieldDef,
  control,
  register,
  setValue,
  errors,
}: DynamicFieldRendererProps) {
  const fieldError = errors[fieldDef.id];
  const errorMessage =
    fieldError && 'message' in fieldError
      ? (fieldError.message as string)
      : undefined;

  switch (fieldDef.type) {
    case 'text':
      return (
        <DynamicTextField
          fieldDef={fieldDef}
          register={register}
          error={errorMessage}
        />
      );

    case 'textarea':
      return (
        <DynamicTextareaField
          fieldDef={fieldDef}
          register={register}
          error={errorMessage}
        />
      );

    case 'number':
      return (
        <DynamicNumberField
          fieldDef={fieldDef}
          register={register}
          error={errorMessage}
        />
      );

    case 'date':
      return (
        <DynamicDateField
          fieldDef={fieldDef}
          control={control}
          error={errorMessage}
        />
      );

    case 'select':
      return (
        <DynamicSelectField
          fieldDef={fieldDef}
          control={control}
          error={errorMessage}
        />
      );

    case 'table':
      return (
        <DynamicTableField
          fieldDef={fieldDef}
          control={control}
          register={register}
          errors={errors}
        />
      );

    case 'staticText':
      return <DynamicStaticText fieldDef={fieldDef} />;

    case 'hidden':
      return (
        <DynamicHiddenField
          fieldDef={fieldDef}
          register={register}
          setValue={setValue}
        />
      );

    default:
      return null;
  }
}
