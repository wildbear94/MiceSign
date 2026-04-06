import { useTranslation } from 'react-i18next';
import type { FieldDefinition, FieldConfig, BuilderAction } from '../../types/builder';
import type { CalculationRule } from '../../../document/types/dynamicForm';

interface PropertyAdvancedTabProps {
  field: FieldDefinition;
  allFields: FieldDefinition[];
  calculationRules: CalculationRule[];
  onUpdateFieldConfig: (fieldId: string, config: Partial<FieldConfig>) => void;
  onDispatch: (action: BuilderAction) => void;
}

export default function PropertyAdvancedTab({
  field,
  allFields,
  calculationRules,
  onUpdateFieldConfig,
  onDispatch,
}: PropertyAdvancedTabProps) {
  const { t } = useTranslation('admin');

  const showWidth = !['staticText', 'hidden'].includes(field.type);
  const showDefaultValue = ['text', 'number'].includes(field.type);
  const showCalculation = field.type === 'number';

  // Find existing calculation rule for this field
  const calcRuleIndex = calculationRules.findIndex(
    (r) => r.targetFieldId === field.id,
  );
  const calcRule: CalculationRule | null =
    calcRuleIndex >= 0 ? calculationRules[calcRuleIndex] : null;

  // Number fields available as source (excluding current field)
  const numberFields = allFields.filter(
    (f) => f.type === 'number' && f.id !== field.id,
  );

  // Table fields with number columns
  const tableColumnSources: { id: string; label: string }[] = [];
  for (const tf of allFields) {
    if (tf.type === 'table' && tf.config?.columns) {
      for (const col of tf.config.columns) {
        if (col.type === 'number') {
          tableColumnSources.push({
            id: `${tf.id}.${col.id}`,
            label: `${tf.label} > ${col.label}`,
          });
        }
      }
    }
  }

  const handleOperationChange = (operation: string) => {
    if (operation === '') {
      // Remove calculation rule
      if (calcRuleIndex >= 0) {
        onDispatch({ type: 'REMOVE_CALCULATION_RULE', index: calcRuleIndex });
        onUpdateFieldConfig(field.id, {
          calculationType: undefined,
          calculationSourceFields: undefined,
        });
      }
    } else {
      const op = operation as CalculationRule['operation'];
      if (calcRule && calcRuleIndex >= 0) {
        const updatedRule: CalculationRule = { ...calcRule, operation: op };
        onDispatch({
          type: 'UPDATE_CALCULATION_RULE',
          index: calcRuleIndex,
          rule: updatedRule,
        });
        onUpdateFieldConfig(field.id, {
          calculationType: op,
          calculationSourceFields: updatedRule.sourceFields,
        });
      } else {
        const newRule: CalculationRule = {
          targetFieldId: field.id,
          operation: op,
          sourceFields: [],
        };
        onDispatch({ type: 'ADD_CALCULATION_RULE', rule: newRule });
        onUpdateFieldConfig(field.id, {
          calculationType: op,
          calculationSourceFields: [],
        });
      }
    }
  };

  const handleSourceFieldToggle = (sourceFieldId: string) => {
    if (!calcRule || calcRuleIndex < 0) return;
    const currentSources = calcRule.sourceFields;
    const newSources = currentSources.includes(sourceFieldId)
      ? currentSources.filter((s) => s !== sourceFieldId)
      : [...currentSources, sourceFieldId];

    const updatedRule: CalculationRule = {
      ...calcRule,
      sourceFields: newSources,
    };
    onDispatch({
      type: 'UPDATE_CALCULATION_RULE',
      index: calcRuleIndex,
      rule: updatedRule,
    });
    onUpdateFieldConfig(field.id, {
      calculationSourceFields: newSources,
    });
  };

  return (
    <div className="space-y-4">
      {showWidth && (
        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('templates.fieldWidth', '너비')}
          </legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`width-${field.id}`}
                checked={(field.config?.width ?? 'full') === 'full'}
                onChange={() =>
                  onUpdateFieldConfig(field.id, { width: 'full' })
                }
                className="text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('templates.fieldWidthFull', '전체 너비')}
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`width-${field.id}`}
                checked={field.config?.width === 'half'}
                onChange={() =>
                  onUpdateFieldConfig(field.id, { width: 'half' })
                }
                className="text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('templates.fieldWidthHalf', '절반 너비')}
              </span>
            </label>
          </div>
        </fieldset>
      )}

      {showDefaultValue && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('templates.fieldDefaultValue', '기본값')}
          </label>
          <input
            type="text"
            value={field.config?.defaultValue ?? ''}
            onChange={(e) =>
              onUpdateFieldConfig(field.id, { defaultValue: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('templates.fieldId', '필드 ID')}
        </label>
        <div className="text-sm text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
          {field.id}
        </div>
      </div>

      {/* Calculation config - visible only for number fields */}
      {showCalculation && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('templates.calculationLabel', '자동 계산')}
          </p>

          {/* Operation select */}
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('templates.calculationOperation', '연산')}
            </label>
            <select
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              value={calcRule?.operation ?? ''}
              onChange={(e) => handleOperationChange(e.target.value)}
            >
              <option value="">선택 안함</option>
              <option value="SUM">SUM</option>
              <option value="ADD">ADD</option>
              <option value="MULTIPLY">MULTIPLY</option>
              <option value="COUNT">COUNT</option>
            </select>
          </div>

          {/* Source fields - only shown when operation is selected */}
          {calcRule && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t('templates.calculationSourceFields', '소스 필드')}
              </label>

              {/* Group 1: Number fields */}
              {numberFields.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-400 mb-1">
                    {t('templates.calculationGroupNumbers', '숫자 필드')}
                  </p>
                  <div className="space-y-1">
                    {numberFields.map((nf) => (
                      <label
                        key={nf.id}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={calcRule.sourceFields.includes(nf.id)}
                          onChange={() => handleSourceFieldToggle(nf.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {nf.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 2: Table columns */}
              {tableColumnSources.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">
                    {t('templates.calculationGroupTableCols', '테이블 칼럼')}
                  </p>
                  <div className="space-y-1">
                    {tableColumnSources.map((tc) => (
                      <label
                        key={tc.id}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={calcRule.sourceFields.includes(tc.id)}
                          onChange={() => handleSourceFieldToggle(tc.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {tc.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
