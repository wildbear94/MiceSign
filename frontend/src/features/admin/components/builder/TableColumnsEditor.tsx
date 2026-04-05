import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FieldDefinition, FieldConfig, FieldType } from '../../types/builder';

interface TableColumnsEditorProps {
  field: FieldDefinition;
  onUpdateFieldConfig: (fieldId: string, config: Partial<FieldConfig>) => void;
}

const COLUMN_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: '텍스트' },
  { value: 'number', label: '숫자' },
  { value: 'date', label: '날짜' },
  { value: 'select', label: '선택' },
];

export default function TableColumnsEditor({
  field,
  onUpdateFieldConfig,
}: TableColumnsEditorProps) {
  const { t } = useTranslation('admin');

  const columns = (field.config?.columns ?? []) as FieldDefinition[];

  const updateColumn = (
    index: number,
    changes: Partial<FieldDefinition>,
  ) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], ...changes };
    onUpdateFieldConfig(field.id, { columns: newColumns });
  };

  const removeColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index);
    onUpdateFieldConfig(field.id, { columns: newColumns });
  };

  const addColumn = () => {
    const newColumn: FieldDefinition = {
      id: nanoid(),
      type: 'text',
      label: t('templates.newColumn', '새 칼럼'),
      required: false,
    };
    onUpdateFieldConfig(field.id, {
      columns: [...columns, newColumn],
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('templates.columnSettings', '칼럼 설정')}
      </h4>

      {columns.map((col, i) => (
        <div
          key={col.id}
          className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <input
              value={col.label}
              onChange={(e) => updateColumn(i, { label: e.target.value })}
              placeholder={t('templates.columnLabel', '칼럼명')}
              className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900"
            />
            <button
              type="button"
              onClick={() => removeColumn(i)}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={col.type}
              onChange={(e) =>
                updateColumn(i, { type: e.target.value as FieldType })
              }
              className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900"
            >
              {COLUMN_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={col.required}
                onChange={(e) =>
                  updateColumn(i, { required: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              {t('templates.columnRequired', '필수')}
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addColumn}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <Plus className="h-4 w-4" />
        {t('templates.addColumn', '칼럼 추가')}
      </button>
    </div>
  );
}
