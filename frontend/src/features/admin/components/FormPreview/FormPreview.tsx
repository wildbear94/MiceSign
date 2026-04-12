import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import type { SchemaField } from '../SchemaFieldEditor/types';
import type { ConditionalRule } from '../../../document/types/dynamicForm';
import { evaluateConditions } from '../../../document/utils/evaluateConditions';
import PreviewFieldRenderer from './PreviewFieldRenderer';

interface FormPreviewProps {
  fields: SchemaField[];
  templateName?: string;
  conditionalRules?: ConditionalRule[];
}

export default function FormPreview({ fields, templateName, conditionalRules }: FormPreviewProps) {
  const { t } = useTranslation('admin');
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  const { hiddenFields, requiredFields } = evaluateConditions(
    conditionalRules || [],
    formValues,
  );

  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <p>{t('templates.previewEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-2xl mx-auto">
      {templateName && (
        <h3 className="text-lg font-semibold text-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          {templateName}
        </h3>
      )}
      {(conditionalRules && conditionalRules.length > 0) && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setFormValues({})}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('templates.condition.resetPreview')}
          </button>
        </div>
      )}
      <div className="space-y-4">
        {fields
          .filter((f) => f.type !== 'hidden' && !hiddenFields.has(f.id))
          .map((field) => (
            <PreviewFieldRenderer
              key={field.id}
              field={field}
              value={formValues[field.id]}
              onChange={(val) => setFormValues(prev => ({ ...prev, [field.id]: val }))}
              dynamicRequired={requiredFields.has(field.id)}
            />
          ))}
      </div>
    </div>
  );
}
