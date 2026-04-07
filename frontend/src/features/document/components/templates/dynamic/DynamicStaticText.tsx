import DOMPurify from 'dompurify';
import type { FieldDefinition } from '../../../types/dynamicForm';

interface DynamicStaticTextProps {
  fieldDef: FieldDefinition;
}

export default function DynamicStaticText({ fieldDef }: DynamicStaticTextProps) {
  const content = fieldDef.config?.content ?? '';

  // If content looks like HTML, render it sanitized
  if (content.includes('<')) {
    return (
      <div className="w-full">
        <div
          className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {content}
      </p>
    </div>
  );
}
