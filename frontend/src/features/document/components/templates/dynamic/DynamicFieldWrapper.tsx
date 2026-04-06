import type { ReactNode } from 'react';

interface DynamicFieldWrapperProps {
  label: string;
  required: boolean;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  labelExtra?: ReactNode;
  isConditionallyRequired?: boolean;
}

export default function DynamicFieldWrapper({
  label,
  required,
  error,
  children,
  htmlFor,
  labelExtra,
  isConditionallyRequired,
}: DynamicFieldWrapperProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div aria-describedby={error ? errorId : undefined}>
      <div className="flex items-center gap-2 mb-1">
        <label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {isConditionallyRequired && !required && (
            <span className="text-amber-600 dark:text-amber-400 ml-0.5">*</span>
          )}
        </label>
        {labelExtra}
      </div>
      {children}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
