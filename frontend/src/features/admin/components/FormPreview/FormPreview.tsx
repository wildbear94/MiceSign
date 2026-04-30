import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import type { SchemaField } from '../SchemaFieldEditor/types';
import type { ConditionalRule, CalculationRule } from '../../../document/types/dynamicForm';
import { evaluateConditions } from '../../../document/utils/evaluateConditions';
import { executeCalculations } from '../../../document/utils/executeCalculations';
import {
  groupFieldsByRow,
  GRID_COLS_CLASS,
} from '../../../document/utils/groupFieldsByRow';
import PreviewFieldRenderer from './PreviewFieldRenderer';

interface FormPreviewProps {
  fields: SchemaField[];
  templateName?: string;
  conditionalRules?: ConditionalRule[];
  calculationRules?: CalculationRule[]; // D-28: Phase 25 실시간 계산
}

export default function FormPreview({
  fields,
  templateName,
  conditionalRules,
  calculationRules,
}: FormPreviewProps) {
  const { t } = useTranslation('admin');
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  const { hiddenFields, requiredFields } = evaluateConditions(
    conditionalRules || [],
    formValues,
  );

  // Phase 25: 계산 결과 필드 ID set (D-29)
  const calcResultIds = useMemo(
    () => new Set((calculationRules || []).map((r) => r.targetFieldId)),
    [calculationRules],
  );

  // Phase 25: 실시간 계산 실행 (D-28)
  // Pitfall 2 방어: 변경 감지 early return 으로 무한 루프 방지.
  // Phase 24.1 DynamicCustomForm 의 RHF watchedKey 패턴은 FormPreview 의
  // 외부 useState 구조상 직접 이식 불가 — Pitfall 5 참조.
  useEffect(() => {
    if (!calculationRules || calculationRules.length === 0) return;
    const results = executeCalculations(calculationRules, formValues);
    let changed = false;
    for (const [fid, v] of Object.entries(results)) {
      if (formValues[fid] !== v) {
        changed = true;
        break;
      }
    }
    if (changed) {
      setFormValues((prev) => ({ ...prev, ...results }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValues, calculationRules]);

  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <p>{t('templates.previewEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-2xl mx-auto">
      {templateName && (
        <h3 className="text-lg font-semibold text-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          {templateName}
        </h3>
      )}
      {(conditionalRules && conditionalRules.length > 0) && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setFormValues({})}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('templates.condition.resetPreview')}
          </button>
        </div>
      )}
      <div className="space-y-4">
        {groupFieldsByRow(
          fields.filter((f) => f.type !== 'hidden' && !hiddenFields.has(f.id)),
        ).map((g) => {
          if (g.kind === 'single') {
            return (
              <div key={g.field.id}>
                <PreviewFieldRenderer
                  field={g.field}
                  value={formValues[g.field.id]}
                  onChange={(val) =>
                    setFormValues((prev) => ({ ...prev, [g.field.id]: val }))
                  }
                  dynamicRequired={requiredFields.has(g.field.id)}
                  disabled={calcResultIds.has(g.field.id)}
                />
              </div>
            );
          }
          return (
            <div
              key={`row-${g.rowGroup}-${g.fields[0].id}`}
              role="group"
              aria-label={t('templates.rowLayout.rowGroupAriaLabel', {
                number: g.rowGroup,
              })}
              className={`grid grid-cols-1 ${GRID_COLS_CLASS[g.cols]} gap-4`}
            >
              {g.fields.map((f) => (
                <div key={f.id} className="min-w-0">
                  <PreviewFieldRenderer
                    field={f}
                    value={formValues[f.id]}
                    onChange={(val) =>
                      setFormValues((prev) => ({ ...prev, [f.id]: val }))
                    }
                    dynamicRequired={requiredFields.has(f.id)}
                    disabled={calcResultIds.has(f.id)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
