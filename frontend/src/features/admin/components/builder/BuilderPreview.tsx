import type { FieldDefinition } from '../../../document/types/dynamicForm';

interface BuilderPreviewProps {
  fields: FieldDefinition[];
}

export default function BuilderPreview({ fields }: BuilderPreviewProps) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            미리보기
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {fields.length}개 필드
          </p>
        </div>

        {/* Fields */}
        {fields.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">
            필드가 없습니다.
          </p>
        )}

        <div className="space-y-4">
          {fields.map((field) => (
            <PreviewField key={field.id} field={field} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewField({ field }: { field: FieldDefinition }) {
  const widthClass =
    field.width === 'third'
      ? 'w-1/3'
      : field.width === 'half'
        ? 'w-1/2'
        : 'w-full';

  if (field.type === 'section') {
    return (
      <div className="pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {field.label}
        </h3>
        {field.children && field.children.length > 0 && (
          <div className="mt-3 ml-4 space-y-3">
            {field.children.map((child) => (
              <PreviewField key={child.id} field={child} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (field.type === 'staticText') {
    return (
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
        {field.config?.content || field.label}
      </div>
    );
  }

  if (field.type === 'hidden') {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-xs text-gray-400 italic">
        <span>[숨김]</span>
        <span>{field.label}</span>
        {field.defaultValue !== undefined && (
          <span>= {String(field.defaultValue)}</span>
        )}
      </div>
    );
  }

  if (field.type === 'table') {
    const columns = field.config?.columns ?? [];
    return (
      <div className={widthClass}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="px-3 py-2 text-left text-gray-600 dark:text-gray-400 font-medium"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.label}
                    {col.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </th>
                ))}
                {columns.length === 0 && (
                  <th className="px-3 py-2 text-gray-400">열을 추가하세요</th>
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="px-3 py-2 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="h-7 bg-gray-100 dark:bg-gray-700 rounded" />
                  </td>
                ))}
                {columns.length === 0 && (
                  <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="h-7 bg-gray-100 dark:bg-gray-700 rounded" />
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={widthClass}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <div
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          style={{ height: `${(field.config?.rows ?? 4) * 1.5}rem` }}
        />
      ) : field.type === 'select' ? (
        <select
          disabled
          className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/50 text-gray-400"
        >
          <option>선택하세요</option>
          {(field.config?.options ?? []).map((opt) => (
            <option key={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={
            field.type === 'date'
              ? 'date'
              : field.type === 'number'
                ? 'number'
                : 'text'
          }
          disabled
          placeholder={field.placeholder ?? ''}
          className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/50 text-gray-400"
        />
      )}
    </div>
  );
}
