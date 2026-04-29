import { useMemo } from 'react';
import { evaluateConditions } from '../../utils/evaluateConditions';
import type {
  SchemaDefinition,
  FieldDefinition,
  ColumnDefinition,
} from '../../types/dynamicForm';
import type { TemplateReadOnlyProps } from '../templates/templateRegistry';
import DrafterInfoHeader from '../DrafterInfoHeader';

/**
 * Phase 24.1-03: CUSTOM 템플릿 읽기 전용 컴포넌트.
 *
 * - schemaSnapshot 을 JSON.parse 하여 SchemaDefinition 으로 사용
 * - formData 를 JSON.parse 하여 값으로 사용
 * - D-22: conditionalRules 평가 후 숨김 필드는 표시하지 않음
 * - D-23: 라벨 + 값 텍스트 (table 은 표) 형식으로 가독성 우선
 */
export default function DynamicCustomReadOnly({
  title,
  formData,
  schemaSnapshot,
  drafterSnapshot,
  drafterLive,
  submittedAt,
}: TemplateReadOnlyProps) {
  const schema = useMemo<SchemaDefinition | null>(() => {
    if (!schemaSnapshot) return null;
    try {
      return JSON.parse(schemaSnapshot) as SchemaDefinition;
    } catch (e) {
      console.error('schemaSnapshot parse failed', e);
      return null;
    }
  }, [schemaSnapshot]);

  const values = useMemo<Record<string, unknown>>(() => {
    if (!formData) return {};
    try {
      return JSON.parse(formData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [formData]);

  if (!schema) {
    return (
      <div className="p-4">
        <DrafterInfoHeader
          mode="submitted"
          snapshot={drafterSnapshot}
          live={drafterLive}
          submittedAt={submittedAt}
        />
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="text-red-600">양식 정보를 불러올 수 없습니다.</div>
      </div>
    );
  }

  // D-22: conditionalRules 평가 → 숨김 필드 미표시
  const { hiddenFields } = evaluateConditions(
    schema.conditionalRules ?? [],
    values,
  );

  return (
    <div className="p-4 space-y-4">
      <DrafterInfoHeader
        mode="submitted"
        snapshot={drafterSnapshot}
        live={drafterLive}
        submittedAt={submittedAt}
      />
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {schema.fields
        .filter((f) => !hiddenFields.has(f.id) && f.type !== 'hidden')
        .map((field) => (
          <ReadOnlyField
            key={field.id}
            field={field}
            value={values[field.id]}
          />
        ))}
    </div>
  );
}

function ReadOnlyField({
  field,
  value,
}: {
  field: FieldDefinition;
  value: unknown;
}) {
  if (field.type === 'staticText') {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400 py-2 whitespace-pre-wrap">
        {field.config?.content ?? field.label}
      </div>
    );
  }

  if (field.type === 'table') {
    const rows = Array.isArray(value)
      ? (value as Record<string, unknown>[])
      : [];
    const columns = field.config?.columns ?? [];
    return (
      <div className="py-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {field.label}
        </div>
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="border border-gray-300 dark:border-gray-600 px-3 py-4 text-center text-gray-500 text-sm"
                >
                  -
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                  >
                    {formatCell(col, row[col.id])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {field.label}
      </div>
      <div className="text-base text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
        {formatValue(field, value) || '-'}
      </div>
    </div>
  );
}

function formatValue(field: FieldDefinition, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (field.type === 'select') {
    const opt = (field.config?.options ?? []).find((o) => o.value === value);
    return opt?.label ?? String(value);
  }
  return String(value);
}

function formatCell(col: ColumnDefinition, value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  if (col.type === 'select') {
    const opt = (col.config?.options ?? []).find((o) => o.value === value);
    return opt?.label ?? String(value);
  }
  return String(value);
}
