import { useMemo } from 'react';
import type { TemplateReadOnlyProps } from './templateRegistry';
import type { SchemaDefinition, FieldDefinition } from '../../types/dynamicForm';

interface DynamicReadOnlyProps extends TemplateReadOnlyProps {
  schemaDefinitionSnapshot?: string | null;
}

export default function DynamicReadOnly({
  formData,
  schemaDefinitionSnapshot,
}: DynamicReadOnlyProps) {
  // Parse schema snapshot
  const schema = useMemo<SchemaDefinition | null>(() => {
    if (!schemaDefinitionSnapshot) return null;
    try {
      return JSON.parse(schemaDefinitionSnapshot) as SchemaDefinition;
    } catch {
      return null;
    }
  }, [schemaDefinitionSnapshot]);

  // Parse form data
  const data = useMemo<Record<string, unknown>>(() => {
    if (!formData) return {};
    try {
      return JSON.parse(formData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [formData]);

  // Fallback: no schema snapshot, show raw JSON
  if (!schema) {
    return formData ? (
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-auto text-gray-900 dark:text-gray-50">
        {formData}
      </pre>
    ) : (
      <p className="text-sm text-gray-400">내용 없음</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-4">
      {schema.fields.map((field) => (
        <div key={field.id} className={field.config?.width === 'half' ? 'w-[calc(50%-0.5rem)]' : 'w-full'}>
          <ReadOnlyField field={field} data={data} />
        </div>
      ))}
    </div>
  );
}

// --- Internal components ---

function ReadOnlyField({
  field,
  data,
}: {
  field: FieldDefinition;
  data: Record<string, unknown>;
}) {
  if (field.type === 'hidden') return null;

  if (field.type === 'staticText') {
    return (
      <div className="text-sm text-gray-700 dark:text-gray-300 py-2">
        {field.config?.content ?? ''}
      </div>
    );
  }

  const value = data[field.id];

  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {field.label}
      </div>
      <ReadOnlyValue field={field} value={value} />
    </div>
  );
}

function ReadOnlyValue({
  field,
  value,
}: {
  field: FieldDefinition;
  value: unknown;
}) {
  // Empty value
  if (value == null || value === '') {
    return <div className="text-sm text-gray-400">---</div>;
  }

  switch (field.type) {
    case 'text':
    case 'date':
      return (
        <div className="text-sm text-gray-900 dark:text-gray-50">
          {String(value)}
        </div>
      );

    case 'textarea':
      return (
        <div className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
          {String(value)}
        </div>
      );

    case 'number': {
      const num = Number(value);
      const formatted = isNaN(num) ? String(value) : num.toLocaleString('ko-KR');
      const unit = field.config?.unit;
      return (
        <div className="text-sm text-gray-900 dark:text-gray-50 text-right">
          {formatted}
          {unit && <span className="text-gray-500 ml-1">{unit}</span>}
        </div>
      );
    }

    case 'select': {
      const options = field.config?.options ?? [];
      const label = options.find((o) => o.value === value)?.label ?? String(value);
      return (
        <div className="text-sm text-gray-900 dark:text-gray-50">
          {label}
        </div>
      );
    }

    case 'table':
      return <ReadOnlyTable field={field} rows={value as Record<string, unknown>[]} />;

    default:
      return (
        <div className="text-sm text-gray-900 dark:text-gray-50">
          {String(value)}
        </div>
      );
  }
}

function ReadOnlyTable({
  field,
  rows,
}: {
  field: FieldDefinition;
  rows: Record<string, unknown>[];
}) {
  const columns = field.config?.columns ?? [];

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return <div className="text-sm text-gray-400">---</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            {columns.map((col) => (
              <th
                key={col.id}
                className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-3 py-2"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => {
                const cellValue = row[col.id];
                const isEmpty = cellValue == null || cellValue === '';
                const isNumber = col.type === 'number';

                let display: string;
                if (isEmpty) {
                  display = '---';
                } else if (isNumber) {
                  const num = Number(cellValue);
                  display = isNaN(num) ? String(cellValue) : num.toLocaleString('ko-KR');
                } else {
                  display = String(cellValue);
                }

                return (
                  <td
                    key={col.id}
                    className={`px-3 py-2 text-sm ${
                      isEmpty
                        ? 'text-gray-400'
                        : 'text-gray-900 dark:text-gray-50'
                    } ${isNumber && !isEmpty ? 'text-right' : ''}`}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
