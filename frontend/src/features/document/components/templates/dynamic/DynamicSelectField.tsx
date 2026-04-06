import { useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react';
import { ChevronDown, X } from 'lucide-react';
import type { FieldDefinition, OptionItem } from '../../../types/dynamicForm';
import DynamicFieldWrapper from './DynamicFieldWrapper';

interface DynamicSelectFieldProps {
  fieldDef: FieldDefinition;
  control: Control<Record<string, unknown>>;
  error?: string;
  isConditionallyRequired?: boolean;
}

export default function DynamicSelectField({
  fieldDef,
  control,
  error,
  isConditionallyRequired,
}: DynamicSelectFieldProps) {
  const [query, setQuery] = useState('');
  const options: OptionItem[] = fieldDef.config?.options ?? [];

  const filteredOptions =
    query === ''
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        );

  const findLabel = (value: string): string =>
    options.find((o) => o.value === value)?.label ?? value;

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
        render={({ field }) => (
          <div className="relative">
            <Combobox
              value={(field.value as string) ?? ''}
              onChange={(val: string) => {
                field.onChange(val);
                setQuery('');
              }}
              onClose={() => setQuery('')}
            >
              <div className="relative">
                <ComboboxInput
                  id={fieldDef.id}
                  displayValue={(val: string) => (val ? findLabel(val) : '')}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`${fieldDef.label} 선택`}
                  className="w-full h-11 px-4 pr-16 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                  {!fieldDef.required && field.value && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        field.onChange('');
                        setQuery('');
                      }}
                      className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
                      aria-label="선택 해제"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ComboboxButton className="h-6 w-6 flex items-center justify-center text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </ComboboxButton>
                </div>
              </div>
              <ComboboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg py-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">
                    검색 결과가 없습니다
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <ComboboxOption
                      key={option.value}
                      value={option.value}
                      className="cursor-pointer select-none px-4 py-2 text-sm text-gray-900 dark:text-gray-50 data-[focus]:bg-blue-50 dark:data-[focus]:bg-blue-900/20"
                    >
                      {option.label}
                    </ComboboxOption>
                  ))
                )}
              </ComboboxOptions>
            </Combobox>
          </div>
        )}
      />
    </DynamicFieldWrapper>
  );
}
