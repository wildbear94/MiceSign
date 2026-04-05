import type { FieldDefinition } from '../../../types/dynamicForm';

interface DynamicStaticTextProps {
  fieldDef: FieldDefinition;
}

export default function DynamicStaticText({ fieldDef }: DynamicStaticTextProps) {
  const content = fieldDef.config?.content ?? '';

  return (
    <div className="text-sm text-gray-700 dark:text-gray-300 py-2">
      {content}
    </div>
  );
}
