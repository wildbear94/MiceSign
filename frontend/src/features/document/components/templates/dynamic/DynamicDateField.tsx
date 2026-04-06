import { useState, useRef, useEffect } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { DayPicker } from 'react-day-picker';
import { format, parse } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, X } from 'lucide-react';
import type { FieldDefinition } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

import 'react-day-picker/style.css';

interface DynamicDateFieldProps {
  fieldDef: FieldDefinition;
  control: Control<Record<string, unknown>>;
  error?: string;
  isConditionallyRequired?: boolean;
}

const DATE_FORMAT = 'yyyy-MM-dd';

export default function DynamicDateField({
  fieldDef,
  control,
  error,
  isConditionallyRequired,
}: DynamicDateFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <DynamicFieldWrapper
      label={fieldDef.label}
      required={fieldDef.required}
      error={error}
      htmlFor={fieldDef.id}
      isConditionallyRequired={isConditionallyRequired}
    >
      <Controller
        name={fieldDef.id}
        control={control}
        render={({ field }) => {
          const dateValue = field.value
            ? parse(field.value as string, DATE_FORMAT, new Date())
            : undefined;
          const isValidDate = dateValue && !isNaN(dateValue.getTime());

          return (
            <div ref={containerRef} className="relative">
              <div className="flex items-center gap-1">
                <button
                  id={fieldDef.id}
                  type="button"
                  onClick={() => setOpen((prev) => !prev)}
                  className="flex items-center gap-2 w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-left text-gray-900 dark:text-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className={isValidDate ? '' : 'text-gray-400'}>
                    {isValidDate ? format(dateValue, DATE_FORMAT) : '날짜 선택'}
                  </span>
                </button>
                {!fieldDef.required && isValidDate && (
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange('');
                      setOpen(false);
                    }}
                    className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    aria-label="날짜 초기화"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {open && (
                <div className="absolute z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                  <DayPicker
                    mode="single"
                    selected={isValidDate ? dateValue : undefined}
                    onSelect={(day) => {
                      if (day) {
                        field.onChange(format(day, DATE_FORMAT));
                      }
                      setOpen(false);
                    }}
                    locale={ko}
                  />
                </div>
              )}
            </div>
          );
        }}
      />
    </DynamicFieldWrapper>
  );
}
