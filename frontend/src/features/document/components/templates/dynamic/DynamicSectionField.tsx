import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { FieldDefinition } from '../../../types/dynamicForm';

interface DynamicSectionFieldProps {
  fieldDef: FieldDefinition;
  children?: ReactNode;
  isReadOnly?: boolean;
}

export default function DynamicSectionField({
  fieldDef,
  children,
}: DynamicSectionFieldProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between border-b border-gray-200
          pb-2 text-left dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800
          rounded-t px-2 py-1 transition-colors"
      >
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
          {fieldDef.label}
        </h3>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {!collapsed && (
        <div className="mt-3 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
