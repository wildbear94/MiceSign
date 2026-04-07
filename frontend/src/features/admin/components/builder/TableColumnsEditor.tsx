import { Plus, Trash2 } from 'lucide-react';
import type { TableColumn } from '../../../document/types/dynamicForm';

interface TableColumnsEditorProps {
  columns: TableColumn[];
  onChange: (columns: TableColumn[]) => void;
}

const COLUMN_TYPES: { value: TableColumn['type']; label: string }[] = [
  { value: 'text', label: '텍스트' },
  { value: 'number', label: '숫자' },
  { value: 'date', label: '날짜' },
  { value: 'select', label: '선택' },
];

export default function TableColumnsEditor({
  columns,
  onChange,
}: TableColumnsEditorProps) {
  function addColumn() {
    const newCol: TableColumn = {
      id: crypto.randomUUID(),
      type: 'text',
      label: `열 ${columns.length + 1}`,
      required: false,
    };
    onChange([...columns, newCol]);
  }

  function removeColumn(index: number) {
    onChange(columns.filter((_, i) => i !== index));
  }

  function updateColumn(index: number, partial: Partial<TableColumn>) {
    onChange(
      columns.map((col, i) => (i === index ? { ...col, ...partial } : col)),
    );
  }

  return (
    <div className="space-y-2">
      {columns.map((col, index) => (
        <div
          key={col.id}
          className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-gray-800/50 rounded"
        >
          <div className="flex-1 space-y-1">
            {/* Column label */}
            <input
              type="text"
              value={col.label}
              onChange={(e) => updateColumn(index, { label: e.target.value })}
              placeholder="열 이름"
              className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            />
            <div className="flex items-center gap-2">
              {/* Column type */}
              <select
                value={col.type}
                onChange={(e) =>
                  updateColumn(index, {
                    type: e.target.value as TableColumn['type'],
                  })
                }
                className="flex-1 h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
              >
                {COLUMN_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
              {/* Required toggle */}
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={col.required ?? false}
                  onChange={(e) =>
                    updateColumn(index, { required: e.target.checked })
                  }
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                />
                필수
              </label>
            </div>
            {/* Column width */}
            <input
              type="text"
              value={col.width ?? ''}
              onChange={(e) =>
                updateColumn(index, { width: e.target.value || undefined })
              }
              placeholder="너비 (예: 120px, 30%)"
              className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            />
          </div>
          {/* Remove */}
          <button
            type="button"
            onClick={() => removeColumn(index)}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
            title="열 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addColumn}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2"
      >
        <Plus className="w-3.5 h-3.5" />
        열 추가
      </button>
    </div>
  );
}
