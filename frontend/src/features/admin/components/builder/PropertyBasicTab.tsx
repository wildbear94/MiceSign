import type { FieldDefinition } from '../../../document/types/dynamicForm';
import SelectOptionsEditor from './SelectOptionsEditor';
import TableColumnsEditor from './TableColumnsEditor';

interface PropertyBasicTabProps {
  field: FieldDefinition;
  onUpdate: (updates: Partial<FieldDefinition>) => void;
}

export default function PropertyBasicTab({
  field,
  onUpdate,
}: PropertyBasicTabProps) {
  function updateConfig(partial: Record<string, unknown>) {
    onUpdate({ config: { ...field.config, ...partial } });
  }

  return (
    <div className="space-y-4">
      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          레이블
        </label>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Placeholder (text, textarea) */}
      {(field.type === 'text' || field.type === 'textarea') && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            플레이스홀더
          </label>
          <input
            type="text"
            value={field.placeholder ?? ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Default value */}
      {field.type !== 'staticText' &&
        field.type !== 'section' &&
        field.type !== 'table' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              기본값
            </label>
            <input
              type="text"
              value={String(field.defaultValue ?? '')}
              onChange={(e) =>
                onUpdate({
                  defaultValue: e.target.value || undefined,
                })
              }
              className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

      {/* Width selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          너비
        </label>
        <div className="flex gap-2">
          {(['full', 'half', 'third'] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onUpdate({ width: w })}
              className={`flex-1 h-8 text-xs font-medium rounded-lg border transition-colors ${
                field.width === w
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {w === 'full' ? '전체' : w === 'half' ? '1/2' : '1/3'}
            </button>
          ))}
        </div>
      </div>

      {/* Required toggle */}
      {field.type !== 'staticText' && field.type !== 'section' && (
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

      {/* Textarea rows */}
      {field.type === 'textarea' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            표시 행 수
          </label>
          <input
            type="number"
            min={2}
            max={20}
            value={field.config?.rows ?? 4}
            onChange={(e) =>
              updateConfig({ rows: e.target.value ? Number(e.target.value) : 4 })
            }
            className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Static text content */}
      {field.type === 'staticText' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            안내 내용
          </label>
          <textarea
            value={field.config?.content ?? ''}
            onChange={(e) => updateConfig({ content: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>
      )}

      {/* Select options */}
      {field.type === 'select' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            선택 옵션
          </label>
          <SelectOptionsEditor
            options={field.config?.options ?? []}
            onChange={(options) => updateConfig({ options })}
            optionSetId={field.config?.optionSetId}
            onOptionSetChange={(id) => updateConfig({ optionSetId: id })}
          />
        </div>
      )}

      {/* Table columns */}
      {field.type === 'table' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            테이블 열
          </label>
          <TableColumnsEditor
            columns={field.config?.columns ?? []}
            onChange={(columns) => updateConfig({ columns })}
          />
        </div>
      )}
    </div>
  );
}
