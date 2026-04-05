import type { ReactNode } from 'react';

interface DynamicFieldWrapperProps {
  label: string;
  required: boolean;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}

export default function DynamicFieldWrapper({
  label,
  required,
  error,
  children,
  htmlFor,
}: DynamicFieldWrapperProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div aria-describedby={error ? errorId : undefined}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
