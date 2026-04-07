import type { FieldDefinition } from '../../../document/types/dynamicForm';

interface PropertyValidationTabProps {
  field: FieldDefinition;
  onUpdate: (updates: Partial<FieldDefinition>) => void;
}

export default function PropertyValidationTab({
  field,
  onUpdate,
}: PropertyValidationTabProps) {
  function updateConfig(partial: Record<string, unknown>) {
    onUpdate({ config: { ...field.config, ...partial } });
  }

  const showRequired =
    field.type !== 'staticText' && field.type !== 'section';
  const showTextLength = field.type === 'text' || field.type === 'textarea';
  const showMinMax = field.type === 'number';
  const showTableRows = field.type === 'table';
  const hasSettings = showRequired || showTextLength || showMinMax || showTableRows;

  if (!hasSettings) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        이 필드 유형에 대한 검증 설정이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Required toggle */}
      {showRequired && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            필수 입력
          </span>
        </label>
      )}

      {/* Min/Max length for text */}
      {showTextLength && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              최소 글자 수
            </label>
            <input
              type="number"
              min={0}
              value={field.config?.minLength ?? ''}
              onChange={(e) =>
                updateConfig({
                  minLength: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              최대 글자 수
            </label>
            <input
              type="number"
              min={1}
              value={field.config?.maxLength ?? ''}
              onChange={(e) =>
                updateConfig({
                  maxLength: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Min / Max for number */}
      {showMinMax && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              최소값
            </label>
            <input
              type="number"
              value={field.config?.min ?? ''}
              onChange={(e) =>
                updateConfig({
                  min: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              최대값
            </label>
            <input
              type="number"
              value={field.config?.max ?? ''}
              onChange={(e) =>
                updateConfig({
                  max: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Table row limits */}
      {showTableRows && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              최소 행 수
            </label>
            <input
              type="number"
              min={0}
              value={field.config?.minRows ?? ''}
              onChange={(e) =>
                updateConfig({
                  minRows: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              최대 행 수
            </label>
            <input
              type="number"
              min={1}
              value={field.config?.maxRows ?? ''}
              onChange={(e) =>
                updateConfig({
                  maxRows: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
