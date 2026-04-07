import type { ReactNode } from 'react';
import type { FieldDefinition } from '../../../types/dynamicForm';

interface DynamicFieldWrapperProps {
  fieldDef: FieldDefinition;
  error?: string;
  children: ReactNode;
}

const WIDTH_CLASSES: Record<string, string> = {
  full: 'w-full',
  half: 'w-full md:w-[calc(50%-0.5rem)]',
  third: 'w-full md:w-[calc(33.333%-0.667rem)]',
};

export default function DynamicFieldWrapper({
  fieldDef,
  error,
  children,
}: DynamicFieldWrapperProps) {
  const widthClass = WIDTH_CLASSES[fieldDef.width ?? 'full'] ?? WIDTH_CLASSES.full;

  return (
    <div className={widthClass}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {fieldDef.label}
        {fieldDef.required && (
          <span className="text-red-500 ml-0.5">*</span>
        )}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
