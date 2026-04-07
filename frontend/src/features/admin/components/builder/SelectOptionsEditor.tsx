import { Plus, Trash2, GripVertical } from 'lucide-react';

interface OptionItem {
  value: string;
  label: string;
}

interface SelectOptionsEditorProps {
  options: OptionItem[];
  onChange: (options: OptionItem[]) => void;
  optionSetId?: number;
  onOptionSetChange?: (id: number | undefined) => void;
}

export default function SelectOptionsEditor({
  options,
  onChange,
  optionSetId,
  onOptionSetChange,
}: SelectOptionsEditorProps) {
  function addOption() {
    const next: OptionItem = {
      value: `option_${options.length + 1}`,
      label: `옵션 ${options.length + 1}`,
    };
    onChange([...options, next]);
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, partial: Partial<OptionItem>) {
    onChange(
      options.map((opt, i) => (i === index ? { ...opt, ...partial } : opt)),
    );
  }

  function moveOption(from: number, to: number) {
    if (to < 0 || to >= options.length) return;
    const next = [...options];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {/* Option set link (if callback provided) */}
      {onOptionSetChange && (
        <div className="mb-3">
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
            옵션 세트 연결
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={optionSetId ?? ''}
              onChange={(e) =>
                onOptionSetChange(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder="옵션 세트 ID"
              className="flex-1 h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            />
            {optionSetId && (
              <button
                type="button"
                onClick={() => onOptionSetChange(undefined)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                해제
              </button>
            )}
          </div>
          {optionSetId && (
            <p className="text-[10px] text-gray-400 mt-1">
              옵션 세트가 연결되면 아래 수동 옵션은 무시됩니다.
            </p>
          )}
        </div>
      )}

      {/* Manual option list */}
      <div className="space-y-1.5">
        {options.map((opt, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => moveOption(index, index - 1)}
              disabled={index === 0}
              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 cursor-grab"
              title="위로 이동"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              value={opt.value}
              onChange={(e) => updateOption(index, { value: e.target.value })}
              placeholder="값"
              className="flex-1 h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            />
            <input
              type="text"
              value={opt.label}
              onChange={(e) => updateOption(index, { label: e.target.value })}
              placeholder="표시명"
              className="flex-1 h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            />
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2"
      >
        <Plus className="w-3.5 h-3.5" />
        옵션 추가
      </button>
    </div>
  );
}
