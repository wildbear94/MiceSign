interface TemplateSettings {
  name: string;
  description: string;
  category: string;
  prefix: string;
  budgetEnabled: boolean;
}

interface TemplateSettingsPanelProps {
  name: string;
  description: string;
  category: string;
  prefix: string;
  budgetEnabled: boolean;
  onChange: (settings: Partial<TemplateSettings>) => void;
}

export default function TemplateSettingsPanel({
  name,
  description,
  category,
  prefix,
  budgetEnabled,
  onChange,
}: TemplateSettingsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          양식 이름
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          설명
        </label>
        <textarea
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          카테고리
        </label>
        <input
          type="text"
          value={category}
          onChange={(e) => onChange({ category: e.target.value })}
          placeholder="예: 총무, 인사, 경비"
          className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Prefix (readonly) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          접두어
        </label>
        <input
          type="text"
          value={prefix}
          readOnly
          className="w-full h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          접두어는 생성 후 변경할 수 없습니다.
        </p>
      </div>

      {/* Budget enabled toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={budgetEnabled}
          onChange={(e) => onChange({ budgetEnabled: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          예산 연동
        </span>
      </label>
      <p className="text-[10px] text-gray-400 -mt-2 ml-6">
        이 양식의 문서가 승인되면 예산 시스템에 반영됩니다.
      </p>
    </div>
  );
}
