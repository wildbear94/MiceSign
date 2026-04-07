import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form';
import type { FieldDefinition } from '../../../types/dynamicForm';
import type { FieldVisibility } from '../../../utils/evaluateConditions';
import DynamicFieldWrapper from './DynamicFieldWrapper';
import DynamicDateField from './DynamicDateField';
import DynamicNumberField from './DynamicNumberField';
import DynamicSelectField from './DynamicSelectField';
import DynamicSectionField from './DynamicSectionField';
import DynamicTableField from './DynamicTableField';
import DynamicStaticText from './DynamicStaticText';
import DynamicHiddenField from './DynamicHiddenField';

interface DynamicFieldRendererProps {
  fieldDef: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors;
  visibility: Map<string, FieldVisibility>;
  isReadOnly?: boolean;
}

export default function DynamicFieldRenderer({
  fieldDef,
  register,
  control,
  errors,
  visibility,
  isReadOnly = false,
}: DynamicFieldRendererProps) {
  const vis = visibility.get(fieldDef.id);
  if (vis && !vis.visible) return null;

  const errorObj = errors[fieldDef.id];
  const errorMessage =
    errorObj && typeof errorObj === 'object' && 'message' in errorObj
      ? String(errorObj.message)
      : undefined;

  switch (fieldDef.type) {
    case 'text':
      return (
        <DynamicFieldWrapper fieldDef={fieldDef} error={errorMessage}>
          <input
            type="text"
            {...register(fieldDef.id)}
            placeholder={fieldDef.placeholder}
            maxLength={fieldDef.config?.maxLength}
            readOnly={isReadOnly}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-1 focus:ring-blue-500
              dark:border-gray-600 dark:bg-gray-700 dark:text-white
              read-only:bg-gray-50 read-only:dark:bg-gray-800"
          />
        </DynamicFieldWrapper>
      );

    case 'textarea':
      return (
        <DynamicFieldWrapper fieldDef={fieldDef} error={errorMessage}>
          <textarea
            {...register(fieldDef.id)}
            placeholder={fieldDef.placeholder}
            maxLength={fieldDef.config?.maxLength}
            readOnly={isReadOnly}
            rows={fieldDef.config?.rows ?? 4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-1 focus:ring-blue-500
              dark:border-gray-600 dark:bg-gray-700 dark:text-white
              read-only:bg-gray-50 read-only:dark:bg-gray-800"
          />
        </DynamicFieldWrapper>
      );

    case 'number':
      return (
        <DynamicNumberField
          fieldDef={fieldDef}
          register={register}
          error={errorMessage}
          isReadOnly={isReadOnly}
        />
      );

    case 'date':
      return (
        <DynamicDateField
          fieldDef={fieldDef}
          register={register}
          error={errorMessage}
          isReadOnly={isReadOnly}
        />
      );

    case 'select':
      return (
        <DynamicSelectField
          fieldDef={fieldDef}
          register={register}
          error={errorMessage}
          isReadOnly={isReadOnly}
        />
      );

    case 'table':
      return (
        <DynamicTableField
          fieldDef={fieldDef}
          control={control}
          register={register}
          errors={errors}
          isReadOnly={isReadOnly}
        />
      );

    case 'section':
      return <DynamicSectionField fieldDef={fieldDef} isReadOnly={isReadOnly} />;

    case 'staticText':
      return <DynamicStaticText fieldDef={fieldDef} />;

    case 'hidden':
      return <DynamicHiddenField fieldDef={fieldDef} register={register} />;

    default:
      return null;
  }
}
