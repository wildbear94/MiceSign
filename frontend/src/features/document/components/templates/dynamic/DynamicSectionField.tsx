import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FieldDefinition } from '../../../types/dynamicForm';

interface DynamicSectionFieldProps {
  fieldDef: FieldDefinition;
  isReadOnly?: boolean;
  children?: React.ReactNode;
}

export default function DynamicSectionField({ fieldDef, isReadOnly, children }: DynamicSectionFieldProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sectionId = `section-content-${fieldDef.id}`;
  const headerId = `section-header-${fieldDef.id}`;

  if (isReadOnly) {
    // Read-only mode: flat header, no collapse toggle per UI-SPEC
    return (
      <div className="w-full">
        <div className="py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {fieldDef.label}
          </span>
        </div>
        <div className="mt-2 space-y-4 pl-4">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        id={headerId}
        onClick={() => setIsCollapsed(prev => !prev)}
        aria-expanded={!isCollapsed}
        aria-controls={sectionId}
        className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {fieldDef.label}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
        />
      </button>
      <div
        id={sectionId}
        role="region"
        aria-labelledby={headerId}
        className={`transition-all duration-200 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[9999px] opacity-100'}`}
      >
        <div className="mt-2 space-y-4 pl-4">
          {children}
        </div>
      </div>
    </div>
  );
}
