import { useMemo } from 'react';
import DynamicForm from '../../../document/components/templates/DynamicForm';
import type { FieldDefinition } from '../../types/builder';
import type { SchemaDefinition } from '../../../document/types/dynamicForm';

interface BuilderPreviewProps {
  fields: FieldDefinition[];
  schemaVersion: number;
  templateCode: string;
}

export default function BuilderPreview({
  fields,
  schemaVersion,
  templateCode,
}: BuilderPreviewProps) {
  const schema = useMemo<SchemaDefinition>(
    () => ({
      version: schemaVersion,
      fields: fields as SchemaDefinition['fields'],
      conditionalRules: [],
      calculationRules: [],
    }),
    [fields, schemaVersion],
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <DynamicForm
        templateCode={templateCode}
        schemaDefinition={schema}
        documentId={null}
        initialData={{ title: '', formData: '{}' }}
        onSave={async () => {}}
      />
    </div>
  );
}
