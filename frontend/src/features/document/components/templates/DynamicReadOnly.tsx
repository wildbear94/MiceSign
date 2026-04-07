import { useMemo } from 'react';
import type { SchemaDefinition, FieldDefinition } from '../../types/dynamicForm';
import { evaluateAllConditions } from '../../utils/evaluateConditions';

interface DynamicReadOnlyProps {
  /** JSON string of schema definition */
  schemaDefinition: string;
  /** JSON string of form data */
  formData: string | null;
}

function formatNumber(val: unknown): string {
  const num = Number(val);
  if (isNaN(num)) return String(val ?? '');
  return num.toLocaleString('ko-KR');
}

function findOptionLabel(
  options: { value: string; label: string }[],
  value: string,
): string {
  const opt = options.find((o) => o.value === value);
  return opt?.label ?? value;
}

function renderField(
  field: FieldDefinition,
  value: unknown,
): React.ReactNode {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {String(value ?? '')}
        </p>
      );

    case 'number':
      return (
        <p className="text-sm text-gray-800 dark:text-gray-200">
          {formatNumber(value)}
        </p>
      );

    case 'date':
      return (
        <p className="text-sm text-gray-800 dark:text-gray-200">
          {String(value ?? '')}
        </p>
      );

    case 'select':
      return (
        <p className="text-sm text-gray-800 dark:text-gray-200">
          {field.config?.options
            ? findOptionLabel(field.config.options, String(value ?? ''))
            : String(value ?? '')}
        </p>
      );

    case 'table': {
      const rows = Array.isArray(value) ? value : [];
      const columns = field.config?.columns ?? [];
      if (rows.length === 0) {
        return <p className="text-sm text-gray-400">데이터 없음</p>;
      }
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200"
                    >
                      {col.type === 'number'
                        ? formatNumber(
                            (row as Record<string, unknown>)?.[col.id],
                          )
                        : String(
                            (row as Record<string, unknown>)?.[col.id] ?? '',
                          )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'staticText':
      return (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {field.config?.content ?? ''}
        </p>
      );

    case 'hidden':
      return null;

    default:
      return (
        <p className="text-sm text-gray-800 dark:text-gray-200">
          {String(value ?? '')}
        </p>
      );
  }
}

export default function DynamicReadOnly({
  schemaDefinition,
  formData,
}: DynamicReadOnlyProps) {
  const schema = useMemo<SchemaDefinition | null>(() => {
    try {
      return JSON.parse(schemaDefinition) as SchemaDefinition;
    } catch {
      return null;
    }
  }, [schemaDefinition]);

  const parsedData = useMemo<Record<string, unknown>>(() => {
    if (!formData) return {};
    try {
      return JSON.parse(formData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [formData]);

  // Evaluate visibility using saved form data
  const visibility = useMemo(() => {
    if (!schema) return new Map();
    const fieldMeta = schema.fields.map((f) => ({
      id: f.id,
      required: f.required ?? false,
    }));
    return evaluateAllConditions(
      schema.conditionalRules ?? [],
      parsedData,
      fieldMeta,
    );
  }, [schema, parsedData]);

  // Fallback: show raw JSON if no schema
  if (!schema) {
    return (
      <div>
        {formData ? (
          <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-gray-400">내용 없음</p>
        )}
      </div>
    );
  }

  // Group into sections
  const groups: { section: FieldDefinition | null; fields: FieldDefinition[] }[] =
    [];
  let currentGroup: { section: FieldDefinition | null; fields: FieldDefinition[] } =
    { section: null, fields: [] };

  for (const field of schema.fields) {
    if (field.type === 'section') {
      if (currentGroup.fields.length > 0 || currentGroup.section) {
        groups.push(currentGroup);
      }
      currentGroup = { section: field, fields: [] };
    } else {
      currentGroup.fields.push(field);
    }
  }
  groups.push(currentGroup);

  return (
    <div className="space-y-6">
      {groups.map((group, gi) => {
        const sectionVis = group.section
          ? visibility.get(group.section.id)
          : null;
        if (sectionVis && !sectionVis.visible) return null;

        return (
          <div key={gi}>
            {group.section && (
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                {group.section.label}
              </h3>
            )}
            <div className="space-y-4">
              {group.fields.map((field) => {
                const vis = visibility.get(field.id);
                if (vis && !vis.visible) return null;
                if (field.type === 'hidden') return null;

                return (
                  <div key={field.id}>
                    {field.type !== 'staticText' && (
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {field.label}
                      </label>
                    )}
                    {renderField(field, parsedData[field.id])}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
