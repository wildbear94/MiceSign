import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FieldDefinition, FieldConfig, OptionSetResponse } from '../../types/builder';
import { useOptionSets } from '../../hooks/useAdminTemplates';

interface SelectOptionsEditorProps {
  field: FieldDefinition;
  onUpdateFieldConfig: (fieldId: string, config: Partial<FieldConfig>) => void;
}

export default function SelectOptionsEditor({
  field,
  onUpdateFieldConfig,
}: SelectOptionsEditorProps) {
  const { t } = useTranslation('admin');
  const [showOptionSetPicker, setShowOptionSetPicker] = useState(false);
  const { data: optionSets, isLoading: isLoadingOptionSets } = useOptionSets();

  const options = field.config?.options ?? [];

  const updateOption = (index: number, changes: Partial<{ value: string; label: string }>) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...changes };
    onUpdateFieldConfig(field.id, { options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onUpdateFieldConfig(field.id, { options: newOptions });
  };

  const addOption = () => {
    const newOpt = { value: '', label: '' };
    onUpdateFieldConfig(field.id, { options: [...options, newOpt] });
  };

  const loadFromOptionSet = (optionSet: OptionSetResponse) => {
    onUpdateFieldConfig(field.id, {
      optionSetId: optionSet.id,
      options: optionSet.items.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    });
    setShowOptionSetPicker(false);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('templates.optionList', '옵션 목록')}
      </h4>

      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={opt.value}
            placeholder={t('templates.optionValue', '값')}
            onChange={(e) => updateOption(i, { value: e.target.value })}
            className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900"
          />
          <input
            value={opt.label}
            placeholder={t('templates.optionLabel', '라벨')}
            onChange={(e) => updateOption(i, { label: e.target.value })}
            className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900"
          />
          <button
            type="button"
            onClick={() => removeOption(i)}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t('templates.addOption', '옵션 추가')}
        </button>

        <button
          type="button"
          onClick={() => setShowOptionSetPicker((v) => !v)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {t('templates.loadOptionSet', '옵션셋 불러오기')}
        </button>
      </div>

      {showOptionSetPicker && (
        <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            {t('templates.selectOptionSet', '옵션셋 선택')}
          </label>
          {isLoadingOptionSets ? (
            <p className="text-xs text-gray-400">
              {t('templates.loading', '로딩 중...')}
            </p>
          ) : (
            <select
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900"
              defaultValue=""
              onChange={(e) => {
                const setId = Number(e.target.value);
                const optionSet = (optionSets as OptionSetResponse[] | undefined)?.find(
                  (s) => s.id === setId,
                );
                if (optionSet) loadFromOptionSet(optionSet);
              }}
            >
              <option value="" disabled>
                {t('templates.chooseOptionSet', '선택하세요')}
              </option>
              {((optionSets as OptionSetResponse[] | undefined) ?? []).map(
                (os) => (
                  <option key={os.id} value={os.id}>
                    {os.name}
                  </option>
                ),
              )}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
