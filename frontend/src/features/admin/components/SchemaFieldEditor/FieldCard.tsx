import { useState } from 'react';
import { ChevronRight, ChevronUp, ChevronDown, Trash2, Zap, Sigma, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConditionalRule, CalculationRule } from '../../../document/types/dynamicForm';
import type { SchemaField } from './types';
import {
  INPUT_CLASS,
  CONDITION_EXCLUDED_TARGET_TYPES,
  WIDE_TYPES,
  ROW_GROUP_BORDER_CLASSES,
  ROW_GROUP_PILL_CLASSES,
} from './constants';
import { toFieldId } from './utils';
import { TypeBadge } from './TypeBadge';
import { FieldConfigEditor } from './FieldConfigEditor';
import { ConditionalRuleEditor } from './ConditionalRuleEditor';
import { CalculationRuleEditor } from './CalculationRuleEditor';
import { renderFormulaFriendly } from './calculationRuleUtils';
import RowPositionSelector from './RowPositionSelector';

export function FieldCard({
  field,
  index,
  total,
  expanded,
  onToggle,
  onUpdate,
  onMove,
  onDelete,
  conditionalRules,
  allFields,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  calculationRules,
  cycles,
  onAddCalcRule,
  onUpdateCalcRule,
  onDeleteCalcRule,
  rowOccupancy,
}: {
  field: SchemaField;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updated: SchemaField) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
  conditionalRules: ConditionalRule[];
  allFields: SchemaField[];
  onAddRule: (rule: ConditionalRule) => void;
  onUpdateRule: (rule: ConditionalRule) => void;
  onDeleteRule: (targetFieldId: string) => void;
  calculationRules: CalculationRule[];
  cycles: string[][];
  onAddCalcRule: (rule: CalculationRule) => void;
  onUpdateCalcRule: (rule: CalculationRule) => void;
  onDeleteCalcRule: (targetFieldId: string) => void;
  // Phase 36 — required, passed from SchemaFieldEditor for cap-3 enforcement in selector
  rowOccupancy: Record<number, number>;
}) {
  const { t } = useTranslation('admin');
  const [labelEdited, setLabelEdited] = useState(false);
  const [conditionExpanded, setConditionExpanded] = useState(false);
  const [calcExpanded, setCalcExpanded] = useState(false);

  const myCalcRule = calculationRules.find((r) => r.targetFieldId === field.id);
  const hasCalcCycle = cycles.some((c) => c.includes(field.id));

  // Phase 36 — wide-type detection + row-group border-l class via static array lookup.
  // Tailwind compile-time scanner requires literal class strings; the cycle index is
  // resolved at runtime against pre-enumerated array entries (see constants.ts).
  const isWide = WIDE_TYPES.has(field.type);
  const rowBorderClass =
    field.rowGroup !== undefined && !isWide
      ? ROW_GROUP_BORDER_CLASSES[(field.rowGroup - 1) % 4]
      : '';
  const rowPillClass =
    field.rowGroup !== undefined && !isWide
      ? ROW_GROUP_PILL_CLASSES[(field.rowGroup - 1) % 4]
      : '';

  const handleLabelChange = (newLabel: string) => {
    onUpdate({ ...field, label: newLabel });
  };

  const handleLabelBlur = () => {
    // Auto-generate ID from label on first edit only (on blur to avoid key change during typing)
    if (!labelEdited && field.label.trim()) {
      setLabelEdited(true);
      onUpdate({ ...field, id: toFieldId(field.label) });
    }
  };

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${rowBorderClass}`}
    >
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={onToggle}
      >
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <TypeBadge type={field.type} />
        {/* Phase 36 — rowGroup pill (non-wide grouped fields only) */}
        {field.rowGroup !== undefined && !isWide && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${rowPillClass}`}
          >
            {t('templates.rowLayout.rowGroupBadge', { number: field.rowGroup })}
          </span>
        )}
        {/* Phase 36 — wide-type "한 줄 차지" amber badge (textarea/table) */}
        {isWide && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Square className="w-3 h-3" />
            {t('templates.rowLayout.wideTypeBadge')}
          </span>
        )}
        <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate flex-1">
          {field.label || (
            <span className="text-gray-400 dark:text-gray-500 italic">
              {t('templates.fieldLabel')}
            </span>
          )}
        </span>
        {field.required && (
          <span className="text-red-500 text-sm font-bold" title={t('templates.fieldRequired')}>
            *
          </span>
        )}
        {conditionalRules.some(r => r.targetFieldId === field.id) && (
          <span className="inline-flex items-center bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded px-1 py-0.5">
            <Zap className="w-3.5 h-3.5" />
          </span>
        )}
        {myCalcRule && (
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono max-w-[200px] ${
              hasCalcCycle
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
            }`}
            title={renderFormulaFriendly(myCalcRule.formula)}
          >
            <Sigma className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">= {renderFormulaFriendly(myCalcRule.formula)}</span>
          </span>
        )}
        {/* Action buttons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove('up')}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
            title="위로 이동"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove('down')}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
            title="아래로 이동"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
            title={t('templates.removeField')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {/* Label + ID row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('templates.fieldLabel')}
              </label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                onBlur={handleLabelBlur}
                className={INPUT_CLASS}
                placeholder={t('templates.fieldLabel')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('templates.fieldId')}
              </label>
              <input
                type="text"
                value={field.id}
                onChange={(e) => onUpdate({ ...field, id: e.target.value })}
                className={INPUT_CLASS}
                placeholder={t('templates.fieldId')}
              />
            </div>
          </div>

          {/* Required checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate({ ...field, required: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('templates.fieldRequired')}
            </span>
          </label>

          {/* Phase 36 — Row position selector (non-wide types only; UI-SPEC §B lines 268~286) */}
          {!isWide && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                {t('templates.rowLayout.sectionLabel')}
              </label>
              <RowPositionSelector
                value={field.rowGroup ?? null}
                onChange={(rg) => onUpdate({ ...field, rowGroup: rg ?? undefined })}
                currentRowOccupancy={rowOccupancy}
                ownCurrentRowGroup={field.rowGroup ?? null}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('templates.rowLayout.helperHint')}
              </p>
            </div>
          )}

          {/* Type-specific config */}
          <FieldConfigEditor
            field={field}
            onConfigChange={(config) => onUpdate({ ...field, config })}
          />

          {/* Conditional rule section (D-01, D-04) */}
          {!CONDITION_EXCLUDED_TARGET_TYPES.includes(field.type) && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <div
                role="button"
                aria-expanded={conditionExpanded}
                onClick={() => setConditionExpanded(!conditionExpanded)}
                className="flex items-center gap-2 py-2 cursor-pointer select-none"
              >
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${conditionExpanded ? 'rotate-90' : ''}`}
                />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('templates.condition.sectionTitle')}
                </span>
              </div>
              {conditionExpanded && (
                <div className="pl-6 pb-1">
                  <ConditionalRuleEditor
                    targetFieldId={field.id}
                    rule={conditionalRules.find(r => r.targetFieldId === field.id)}
                    allFields={allFields}
                    allRules={conditionalRules}
                    onAddRule={onAddRule}
                    onUpdateRule={onUpdateRule}
                    onDeleteRule={() => onDeleteRule(field.id)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Calculation rule section (D-01, D-19) */}
          {field.type === 'number' && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <div
                role="button"
                aria-expanded={calcExpanded}
                onClick={() => setCalcExpanded(!calcExpanded)}
                className="flex items-center gap-2 py-2 cursor-pointer select-none"
              >
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${calcExpanded ? 'rotate-90' : ''}`}
                />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('templates.calculation.sectionTitle')}
                </span>
              </div>
              {calcExpanded && (
                <div className="pl-6 pb-1">
                  <CalculationRuleEditor
                    targetFieldId={field.id}
                    rule={myCalcRule}
                    allFields={allFields}
                    allRules={calculationRules}
                    cycles={cycles}
                    onAddRule={onAddCalcRule}
                    onUpdateRule={onUpdateCalcRule}
                    onDeleteRule={() => onDeleteCalcRule(field.id)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
