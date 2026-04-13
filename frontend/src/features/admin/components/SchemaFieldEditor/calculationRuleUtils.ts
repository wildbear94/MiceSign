import type { CalculationRule } from '../../../document/types/dynamicForm';
import type {
  SchemaField,
  PresetConfig,
  CalcSource,
  CalcValidationError,
} from './types';
import { CALC_RESERVED_WORDS } from './constants';

/**
 * D-23: 공식에서 필드/컬럼 레퍼런스 추출.
 * Source-synced with executeCalculations.ts:230 의 정규식.
 * 런타임 경로(executeCalculations.ts)를 수정하지 않기 위해 복제한다.
 *
 * Pitfall 7 대응: 자기참조도 여기서 추출되므로 validateFormula 에서
 * selfReference 로 별도 분기 가능 (detectCircularDeps 도 self-loop 감지하지만 조기 피드백).
 *
 * T-25-02 대응: global regex 의 lastIndex 를 호출 초기에 0 으로 리셋.
 */
const FIELD_REF_PATTERN = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/g;

export function extractDependencies(formula: string): string[] {
  if (!formula) return [];
  const refs = new Set<string>();
  // 정규식 state 초기화 (global flag 공유 방지)
  FIELD_REF_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FIELD_REF_PATTERN.exec(formula)) !== null) {
    const token = m[0];
    if (CALC_RESERVED_WORDS.has(token)) continue;
    if (/^\d/.test(token)) continue; // 숫자 리터럴 방어
    refs.add(token);
  }
  return Array.from(refs);
}

/**
 * D-15, D-16: PresetConfig → formula 문자열.
 * 저장 포맷은 executeCalculations 가 이해하는 형태 (`*`, `/`).
 */
export function buildFormulaFromPreset(preset: PresetConfig): string {
  const p = preset.params as Record<string, string | string[]>;
  switch (preset.type) {
    case 'sum-col':
      return `SUM(${p.tableId}.${p.columnId})`;
    case 'sum-mul':
      return `SUM(${p.tableId}.${p.columnA} * ${p.tableId}.${p.columnB})`;
    case 'field-sum': {
      const ids = (p.fieldIds as string[]) ?? [];
      return ids.join(' + ');
    }
    case 'ratio':
      return `${p.numerator} / ${p.denominator} * 100`;
    case 'custom':
      return (p.raw as string) ?? '';
    default:
      return '';
  }
}

/**
 * D-18: 역방향 복원. 엄격 매칭, 실패 시 'custom'.
 * Pitfall 6 대응: 호출자는 이 결과를 useMemo 로 파생 상태로만 유지해야 한다.
 */
export function parseFormulaToPreset(formula: string): PresetConfig {
  const trimmed = formula.trim();

  // sum-mul: SUM(X.a * X.b)  (동일 tableId)
  const mulMatch = /^SUM\(\s*(\w+)\.(\w+)\s*\*\s*(\w+)\.(\w+)\s*\)$/.exec(trimmed);
  if (mulMatch && mulMatch[1] === mulMatch[3]) {
    return {
      type: 'sum-mul',
      params: { tableId: mulMatch[1], columnA: mulMatch[2], columnB: mulMatch[4] },
    };
  }

  // sum-col: SUM(X.a)
  const colMatch = /^SUM\(\s*(\w+)\.(\w+)\s*\)$/.exec(trimmed);
  if (colMatch) {
    return {
      type: 'sum-col',
      params: { tableId: colMatch[1], columnId: colMatch[2] },
    };
  }

  // ratio: A / B * 100 (정확히 *100 일 때만)
  const ratioMatch = /^(\w+)\s*\/\s*(\w+)\s*\*\s*100$/.exec(trimmed);
  if (ratioMatch) {
    return {
      type: 'ratio',
      params: { numerator: ratioMatch[1], denominator: ratioMatch[2] },
    };
  }

  // field-sum: A + B (+ C ...), 각 토큰은 단순 식별자만
  const sumMatch = /^\w+(\s*\+\s*\w+)+$/.exec(trimmed);
  if (sumMatch) {
    return {
      type: 'field-sum',
      params: { fieldIds: trimmed.split(/\s*\+\s*/) },
    };
  }

  return { type: 'custom', params: { raw: formula } };
}

/**
 * D-20, D-21: 타겟 필드에서 사용 가능한 계산 소스 목록.
 * - 루트 number 필드 (자기 자신 제외)
 * - table 필드 내부 number 컬럼 (`fieldId.columnId`)
 */
export function getAvailableCalcSources(
  targetFieldId: string,
  allFields: SchemaField[],
): CalcSource[] {
  const sources: CalcSource[] = [];
  for (const f of allFields) {
    if (f.id === targetFieldId) continue;
    if (f.type === 'number') {
      sources.push({ fieldId: f.id, label: f.label || f.id });
    } else if (f.type === 'table') {
      const cols = f.config.columns || [];
      for (const col of cols) {
        if (col.type === 'number') {
          sources.push({
            fieldId: f.id,
            columnId: col.id,
            label: `${f.label || f.id}.${col.label || col.id}`,
          });
        }
      }
    }
  }
  return sources;
}

/**
 * D-10, D-26, D-27: 공식 유효성 검증.
 * 반환: 에러 코드 (i18n key 에 매핑) 또는 null.
 */
export function validateFormula(
  formula: string,
  allFields: SchemaField[],
  targetFieldId: string,
): CalcValidationError | null {
  if (!formula.trim()) return 'emptyFormula';

  // 괄호 매칭
  let depth = 0;
  for (const ch of formula) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) return 'syntaxError';
  }
  if (depth !== 0) return 'syntaxError';

  const deps = extractDependencies(formula);

  // Pitfall 7: 자기참조 조기 차단
  if (deps.includes(targetFieldId)) return 'selfReference';

  for (const dep of deps) {
    const [fieldId, columnId] = dep.split('.');
    const field = allFields.find(f => f.id === fieldId);
    if (!field) return 'unknownField';

    if (columnId !== undefined) {
      if (field.type !== 'table') return 'unknownField';
      const cols = field.config.columns || [];
      const col = cols.find(c => c.id === columnId);
      if (!col) return 'unknownColumn';
      if (col.type !== 'number') return 'unknownColumn';
    } else {
      if (field.type !== 'number') return 'unknownField';
    }
  }
  return null;
}

/**
 * D-06, D-07: 필드 삭제 시 관련 계산 규칙 정리 (양방향).
 * 타겟 또는 dependsOn 에 삭제 필드가 포함되면 규칙 제거.
 * table 필드 참조 `items.price` 도 `items` 삭제 시 함께 정리.
 */
export function cleanupCalcRulesForDeletedField(
  deletedFieldId: string,
  rules: CalculationRule[],
): [CalculationRule[], number] {
  const before = rules.length;
  const cleaned = rules.filter(r => {
    if (r.targetFieldId === deletedFieldId) return false;
    const refsDeleted = r.dependsOn.some(
      d => d === deletedFieldId || d.startsWith(`${deletedFieldId}.`),
    );
    return !refsDeleted;
  });
  return [cleaned, before - cleaned.length];
}

/**
 * D-08: 필드 타입 변경 시 관련 계산 규칙 정리.
 * - 새 타입이 number 가 아니게 되면 해당 필드가 타겟이거나 루트 소스인 규칙 모두 제거.
 * - table 로 남아있는 경우 내부 컬럼은 영향 없음 (Pitfall 3 는 호출자에서 처리).
 */
export function cleanupCalcRulesForTypeChange(
  changedFieldId: string,
  newType: string,
  rules: CalculationRule[],
): [CalculationRule[], number] {
  const before = rules.length;
  let cleaned = [...rules];

  if (newType !== 'number') {
    // 타겟으로 사용된 규칙 제거
    cleaned = cleaned.filter(r => r.targetFieldId !== changedFieldId);
    // 루트 소스로 참조하는 규칙 제거 (table.col 형식은 table 타입 변경이 아니므로 여기서 제외)
    cleaned = cleaned.filter(r => !r.dependsOn.includes(changedFieldId));
  }

  return [cleaned, before - cleaned.length];
}

/**
 * Pitfall 3 대응 helper: table 필드의 특정 컬럼 id 가 number 에서 다른 타입으로 변경되었을 때
 * 해당 컬럼을 참조하는 규칙 제거. 호출자는 이전/이후 columns 를 비교해 changedColumnIds 를 전달.
 */
export function cleanupCalcRulesForTableColumnChange(
  tableFieldId: string,
  changedColumnIds: string[],
  rules: CalculationRule[],
): [CalculationRule[], number] {
  if (changedColumnIds.length === 0) return [rules, 0];
  const before = rules.length;
  const refs = new Set(changedColumnIds.map(cid => `${tableFieldId}.${cid}`));
  const cleaned = rules.filter(r => !r.dependsOn.some(d => refs.has(d)));
  return [cleaned, before - cleaned.length];
}

/**
 * D-25: 공식 1줄 미리보기 렌더 — `*`→`×`, `/`→`÷`.
 * 저장 값은 원본을 유지하고 표시용 변환만 수행한다.
 */
export function renderFormulaFriendly(formula: string): string {
  return formula.replace(/\*/g, '×').replace(/\//g, '÷');
}
