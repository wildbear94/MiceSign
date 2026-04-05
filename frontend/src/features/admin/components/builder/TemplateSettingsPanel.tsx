import { useTranslation } from 'react-i18next';
import type { TemplateSettings } from '../../types/builder';

interface TemplateSettingsPanelProps {
  settings: TemplateSettings;
  onUpdate: (changes: Partial<TemplateSettings>) => void;
}

export default function TemplateSettingsPanel({
  settings,
  onUpdate,
}: TemplateSettingsPanelProps) {
  const { t } = useTranslation('admin');

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('templates.templateSettings', '템플릿 설정')}
      </h3>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('templates.name', '이름')}
        </label>
        <input
          type="text"
          value={settings.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('templates.prefix', '접두사')}
        </label>
        <input
          type="text"
          value={settings.prefix}
          disabled
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1">
          {t('templates.prefixReadonly', '접두사는 생성 후 변경할 수 없습니다')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('templates.description', '설명')}
        </label>
        <textarea
          value={settings.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('templates.category', '카테고리')}
        </label>
        <input
          type="text"
          value={settings.category}
          onChange={(e) => onUpdate({ category: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>
    </div>
  );
}
