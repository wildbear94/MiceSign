import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Sigma } from 'lucide-react';
import { toast } from 'sonner';
import type { CalculationRule } from '../../../document/types/dynamicForm';
import type { SchemaField, PresetConfig, PresetType, CalcSource, CalcValidationError } from './types';
import { SMALL_INPUT_CLASS, PRESET_OPTIONS } from './constants';
import {
  extractDependencies,
  buildFormulaFromPreset,
  parseFormulaToPreset,
  validateFormula,
  getAvailableCalcSources,
  renderFormulaFriendly,
} from './calculationRuleUtils';

interface CalculationRuleEditorProps {
  targetFieldId: string;
  rule: CalculationRule | undefined;
  allFields: SchemaField[];
  allRules: CalculationRule[];
  /** D-24: 상위에서 detectCircularDeps 로 계산된 사이클 목록 */
  cycles: string[][];
  onAddRule: (rule: CalculationRule) => void;
  onUpdateRule: (rule: CalculationRule) => void;
  onDeleteRule: () => void;
}

export function CalculationRuleEditor({
  targetFieldId,
  rule,
  allFields,
  allRules: _allRules,
  cycles,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}: CalculationRuleEditorProps) {
  const { t } = useTranslation('admin');
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [rawInput, setRawInput] = useState(rule?.formula ?? '');
  const [blurError, setBlurError] = useState<CalcValidationError | null>(null);

  // rule.formula 외부 변경 시 rawInput 동기화
  useEffect(() => {
    setRawInput(rule?.formula ?? '');
    setBlurError(null);
  }, [rule?.formula]);

  // Pitfall 6: PresetConfig 는 파생 상태 (useMemo)
  const presetConfig = useMemo(
    () => (rule ? parseFormulaToPreset(rule.formula) : null),
    [rule],
  );

  // D-24: 이 타겟 필드에 관련된 사이클만 필터
  const myCycles = useMemo(
    () => cycles.filter((c) => c.includes(targetFieldId)),
    [cycles, targetFieldId],
  );

  const sources = useMemo(
    () => getAvailableCalcSources(targetFieldId, allFields),
    [targetFieldId, allFields],
  );

  const handleAdd = () => {
    if (sources.length === 0) {
      toast(t('templates.calculation.noSourceFields'));
      return;
    }
    // 기본값: 첫 table 컬럼이 있으면 sum-col, 없으면 field-sum 으로 첫 소스 1개
    const firstTable = sources.find((s) => s.columnId);
    const defaultFormula = firstTable
      ? `SUM(${firstTable.fieldId}.${firstTable.columnId})`
      : sources[0].fieldId;
    onAddRule({
      targetFieldId,
      formula: defaultFormula,
      dependsOn: extractDependencies(defaultFormula),
    });
  };

  if (!rule) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500">
        <p>{t('templates.calculation.noRule')}</p>
        <button
          type="button"
          onClick={handleAdd}
          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('templates.calculation.addRule')}
        </button>
      </div>
    );
  }

  const updateFormula = (newFormula: string) => {
    onUpdateRule({
      ...rule,
      formula: newFormula,
      dependsOn: extractDependencies(newFormula),
    });
  };

  // D-26: blur 시 파싱 검증
  const handleAdvancedBlur = () => {
    const err = validateFormula(rawInput, allFields, targetFieldId);
    setBlurError(err);
    if (!err) {
      updateFormula(rawInput);
    }
  };

  // 프리셋 파라미터 변경 시 즉시 공식 재빌드
  const updateFromPreset = (next: PresetConfig) => {
    updateFormula(buildFormulaFromPreset(next));
  };

  return (
    <div className="space-y-3">
      {/* 모드 토글 */}
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setIsAdvanced(false)}
          className={!isAdvanced ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-500'}
        >
          {t('templates.calculation.presetMode')}
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={() => setIsAdvanced(true)}
          className={isAdvanced ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-500'}
        >
          {t('templates.calculation.advancedMode')}
        </button>
        <button
          type="button"
          onClick={onDeleteRule}
          title={t('templates.calculation.deleteRule')}
          className="ml-auto p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 프리셋 영역 */}
      {!isAdvanced && presetConfig && (
        <PresetSelector
          config={presetConfig}
          allFields={allFields}
          sources={sources}
          onConfigChange={updateFromPreset}
        />
      )}

      {/* 고급 모드 영역 */}
      {isAdvanced && (
        <div>
          <input
            type="text"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            onBlur={handleAdvancedBlur}
            className={`${SMALL_INPUT_CLASS} font-mono ${blurError ? 'border-red-500' : ''}`}
            placeholder={t('templates.calculation.advancedPlaceholder')}
          />
          {blurError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {t(`templates.calculation.errors.${blurError}`)}
            </p>
          )}
        </div>
      )}

      {/* 1줄 공식 미리보기 (D-25) */}
      <div className="flex items-center gap-1.5 text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
        <Sigma className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">= {renderFormulaFriendly(rule.formula)}</span>
      </div>

      {/* D-24: 순환 경고 인라인 배너 */}
      {myCycles.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded px-3 py-2 text-xs text-red-700 dark:text-red-300">
          ⚠ {t('templates.calculation.errors.circularDependency')}: {myCycles[0].join(' → ')}
        </div>
      )}
    </div>
  );
}

// ─── 프리셋별 파라미터 드롭다운 sub-component ───
interface PresetSelectorProps {
  config: PresetConfig;
  allFields: SchemaField[];
  sources: CalcSource[];
  onConfigChange: (next: PresetConfig) => void;
}

function PresetSelector({ config, allFields, sources, onConfigChange }: PresetSelectorProps) {
  const { t } = useTranslation('admin');

  const selectPreset = (type: PresetType) => {
    const firstTable = sources.find((s) => s.columnId);
    const rootNums = sources.filter((s) => !s.columnId);
    switch (type) {
      case 'sum-col':
        if (firstTable) {
          onConfigChange({ type, params: { tableId: firstTable.fieldId, columnId: firstTable.columnId! } });
        }
        break;
      case 'sum-mul': {
        if (firstTable) {
          const tableCols = sources.filter((s) => s.fieldId === firstTable.fieldId && s.columnId);
          const a = tableCols[0]?.columnId ?? '';
          const b = tableCols[1]?.columnId ?? tableCols[0]?.columnId ?? '';
          onConfigChange({ type, params: { tableId: firstTable.fieldId, columnA: a, columnB: b } });
        }
        break;
      }
      case 'field-sum':
        if (rootNums.length > 0) {
          onConfigChange({ type, params: { fieldIds: [rootNums[0].fieldId] } });
        }
        break;
      case 'ratio':
        if (rootNums.length >= 2) {
          onConfigChange({ type, params: { numerator: rootNums[0].fieldId, denominator: rootNums[1].fieldId } });
        } else if (rootNums.length === 1) {
          onConfigChange({ type, params: { numerator: rootNums[0].fieldId, denominator: rootNums[0].fieldId } });
        }
        break;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => selectPreset(opt.type)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              config.type === opt.type
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
        {config.type === 'custom' && (
          <span className="px-2 py-1 text-xs rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
            custom
          </span>
        )}
      </div>

      <PresetParams config={config} sources={sources} allFields={allFields} onConfigChange={onConfigChange} />
    </div>
  );
}

function PresetParams({
  config,
  sources,
  allFields,
  onConfigChange,
}: {
  config: PresetConfig;
  sources: CalcSource[];
  allFields: SchemaField[];
  onConfigChange: (next: PresetConfig) => void;
}) {
  const { t } = useTranslation('admin');
  const tableSources = sources.filter((s) => s.columnId);
  const rootNums = sources.filter((s) => !s.columnId);
  const tableFieldIds = Array.from(new Set(tableSources.map((s) => s.fieldId)));

  const update = (params: Record<string, unknown>) => {
    onConfigChange({ type: config.type, params: { ...config.params, ...params } });
  };

  if (config.type === 'sum-col') {
    const currentTable = (config.params.tableId as string) ?? '';
    const columnsInTable = tableSources.filter((s) => s.fieldId === currentTable);
    return (
      <div className="grid grid-cols-2 gap-2">
        <select
          className={SMALL_INPUT_CLASS}
          value={currentTable}
          onChange={(e) => update({ tableId: e.target.value, columnId: '' })}
        >
          <option value="">{t('templates.calculation.presets.selectTable')}</option>
          {tableFieldIds.map((fid) => {
            const field = allFields.find((f) => f.id === fid);
            return (
              <option key={fid} value={fid}>
                {field?.label ?? fid}
              </option>
            );
          })}
        </select>
        <select
          className={SMALL_INPUT_CLASS}
          value={(config.params.columnId as string) ?? ''}
          onChange={(e) => update({ columnId: e.target.value })}
        >
          <option value="">{t('templates.calculation.presets.selectColumn')}</option>
          {columnsInTable.map((s) => (
            <option key={s.columnId} value={s.columnId}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (config.type === 'sum-mul') {
    const currentTable = (config.params.tableId as string) ?? '';
    const columnsInTable = tableSources.filter((s) => s.fieldId === currentTable);
    return (
      <div className="grid grid-cols-3 gap-2">
        <select
          className={SMALL_INPUT_CLASS}
          value={currentTable}
          onChange={(e) => update({ tableId: e.target.value, columnA: '', columnB: '' })}
        >
          <option value="">{t('templates.calculation.presets.selectTable')}</option>
          {tableFieldIds.map((fid) => {
            const field = allFields.find((f) => f.id === fid);
            return (
              <option key={fid} value={fid}>
                {field?.label ?? fid}
              </option>
            );
          })}
        </select>
        <select
          className={SMALL_INPUT_CLASS}
          value={(config.params.columnA as string) ?? ''}
          onChange={(e) => update({ columnA: e.target.value })}
        >
          <option value="">{t('templates.calculation.presets.selectColumnA')}</option>
          {columnsInTable.map((s) => (
            <option key={s.columnId} value={s.columnId}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className={SMALL_INPUT_CLASS}
          value={(config.params.columnB as string) ?? ''}
          onChange={(e) => update({ columnB: e.target.value })}
        >
          <option value="">{t('templates.calculation.presets.selectColumnB')}</option>
          {columnsInTable.map((s) => (
            <option key={s.columnId} value={s.columnId}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (config.type === 'field-sum') {
    const selected = (config.params.fieldIds as string[]) ?? [];
    return (
      <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-1">
        {rootNums.length === 0 && (
          <p className="text-xs text-gray-400">{t('templates.calculation.noSourceFields')}</p>
        )}
        {rootNums.map((s) => (
          <label key={s.fieldId} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(s.fieldId)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, s.fieldId]
                  : selected.filter((id) => id !== s.fieldId);
                update({ fieldIds: next });
              }}
            />
            {s.label}
          </label>
        ))}
      </div>
    );
  }

  if (config.type === 'ratio') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('templates.calculation.presets.numerator')}</label>
          <select
            className={SMALL_INPUT_CLASS}
            value={(config.params.numerator as string) ?? ''}
            onChange={(e) => update({ numerator: e.target.value })}
          >
            <option value="">—</option>
            {rootNums.map((s) => (
              <option key={s.fieldId} value={s.fieldId}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('templates.calculation.presets.denominator')}</label>
          <select
            className={SMALL_INPUT_CLASS}
            value={(config.params.denominator as string) ?? ''}
            onChange={(e) => update({ denominator: e.target.value })}
          >
            <option value="">—</option>
            {rootNums.map((s) => (
              <option key={s.fieldId} value={s.fieldId}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // custom
  return (
    <p className="text-xs text-amber-600 dark:text-amber-400">
      {t('templates.calculation.advancedMode')} →
    </p>
  );
}
