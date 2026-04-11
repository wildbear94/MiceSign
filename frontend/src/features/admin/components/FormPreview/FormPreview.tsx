import { useTranslation } from 'react-i18next';
import type { SchemaField } from '../SchemaFieldEditor/types';
import PreviewFieldRenderer from './PreviewFieldRenderer';

interface FormPreviewProps {
  fields: SchemaField[];
  templateName?: string;
}

export default function FormPreview({ fields, templateName }: FormPreviewProps) {
  const { t } = useTranslation('admin');

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
      <div className="space-y-4">
        {fields
          .filter((f) => f.type !== 'hidden')
          .map((field) => (
            <PreviewFieldRenderer key={field.id} field={field} />
          ))}
      </div>
    </div>
  );
}
