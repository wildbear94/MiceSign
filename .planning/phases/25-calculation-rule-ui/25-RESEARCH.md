# Phase 25: 계산 규칙 UI - Research

**Researched:** 2026-04-13
**Domain:** React admin 편집 UI (프론트엔드 전용, 계산 엔진은 기구축)
**Confidence:** HIGH (코드베이스 1차 근거 기반)

## Summary

Phase 25 는 100% 프론트엔드 admin UI 작업이다. 핵심 런타임 엔진(`executeCalculations`, `detectCircularDeps`)과 사용자측 실시간 계산 통합(`DynamicCustomForm` 의 `watchedKey` 기반 `setValue` 루프)은 Phase 24.1 에서 이미 완성되어 있다. Phase 25 의 작업은 다음 4가지로 요약된다:

1. **`CalculationRuleEditor` 컴포넌트 신설** — Phase 24 `ConditionalRuleEditor.tsx` 패턴을 그대로 복제. 프리셋 4종 라디오/탭 + 파라미터 드롭다운 + 고급 자유입력 모드.
2. **`calculationRuleUtils.ts` 신설** — `extractDependencies(formula)` (executeCalculations 의 정규식 재사용), `buildFormulaFromPreset(preset, params)`, `parseFormulaToPreset(formula)` (역방향 복원), `validateFormula(formula, fields)` (파싱/참조/빈 문자열 검증), `cleanupCalcRulesForDeletedField`, `cleanupCalcRulesForTypeChange`.
3. **`TemplateFormModal.tsx` + `SchemaFieldEditor.tsx` + `FieldCard.tsx` 통합** — `calculationRules` 상태 관리(현재 line 157 하드코딩 `[]`), 필드 삭제/타입 변경 시 cascade, FieldCard 헤더 Σ 배지, FieldConfigEditor 에 섹션 추가, 저장 버튼 disabled 동기화.
4. **admin `FormPreview.tsx` 에 실시간 계산 통합** — 현재 `evaluateConditions` 만 호출하는 구조에 `executeCalculations` 호출 + 계산 결과 필드 disabled 처리. Phase 24.1 `DynamicCustomForm.tsx:148-165` 의 `useEffect + setValue` 패턴을 `FormPreview` 의 외부 `formValues` state 기반으로 변환.

**Primary recommendation:** Phase 24 `ConditionalRuleEditor` / `conditionalRuleUtils` / `FieldCard` 통합 패턴을 **1:1 대응**으로 복제하되, 계산 UX 특유의 "프리셋 ↔ 고급 모드 동기화"는 별도 helper 타입 `PresetMode = 'sum-col' | 'sum-mul' | 'field-sum' | 'ratio' | 'custom'` 로 캡슐화한다. 실시간 `detectCircularDeps` 호출은 모든 `calculationRules` 전체에 대해 수행해도 O(V+E) 이며 필드 수 50개 이하 규모에서 성능 문제 없음.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** FieldConfigEditor 내부에 접기/펼치기 '계산 규칙' 섹션으로 배치 (Phase 24 D-01 동일 패턴)
- **D-02:** 필드당 계산 규칙 1개만 허용 (`targetFieldId` 에 대해 유일)
- **D-03:** 빈 상태는 '계산 규칙이 없습니다' 안내 + '계산 추가' 버튼
- **D-04:** 규칙 삭제 즉시 삭제 (확인 다이얼로그 없음)
- **D-05:** `SchemaDefinition.calculationRules[]` 중앙 배열 유지
- **D-06:** 필드 삭제 시 관련 계산 규칙 자동 제거 + 토스트
- **D-07:** 양방향 정리 (타겟/소스 모두)
- **D-08:** 필드 타입 변경 시 자동 제거 + 토스트 (타겟/소스 모두 number→다른 타입 시)
- **D-09:** 필드 라벨 변경은 규칙에 영향 없음 (ID 기반)
- **D-10:** 유효성 검사는 프론트엔드 전용
- **D-11:** 검증 실패 시 에러 토스트 + 저장 버튼 disabled
- **D-12:** i18n 키 `admin.templates.calculation.*`
- **D-13:** `CalculationRule` 타입 재사용 (`dynamicForm.ts`). 편집 UI helper 타입만 `SchemaFieldEditor/types.ts` 에 추가
- **D-14:** 하이브리드 UX — 프리셋 + 고급 자유입력
- **D-15:** 프리셋 4종 — (1) SUM(테이블 컬럼), (2) SUM(컬럼×컬럼), (3) 필드합, (4) 비율
- **D-16:** 프리셋 UI — 라디오/탭 → 드롭다운 → 공식 자동 생성 + 1줄 미리보기
- **D-17:** 고급 모드 자유입력 — single-line input, blur 시 파싱 검증
- **D-18:** 프리셋 ↔ 고급 전환 시 공식 보존, 역방향은 포맷 일치할 때만 프리셋 복원
- **D-19:** 타겟 필드는 루트 number 타입만 (table 내부 컬럼 제외)
- **D-20:** 소스 필드는 루트 number + table 컬럼 number (`items.price` 형식)
- **D-21:** 자기참조 차단
- **D-22:** `dependsOn[]` 자동 추출 — UI 비노출
- **D-23:** 추출 규칙 — `[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*` + 예약어(`SUM`) 제거 + 숫자 리터럴 제거
- **D-24:** 실시간 순환 감지 + 인라인 배너 + 저장 차단 (양방향 배너)
- **D-25:** Σ 배지 + 공식 1줄 미리보기 (`*`→`×`, `/`→`÷` 친화적 렌더, 저장은 원본 유지)
- **D-26:** blur 시 + 저장 시 2단계 에러 표시
- **D-27:** 에러 메시지 키 — `unknownField`, `unknownColumn`, `syntaxError`, `emptyFormula`, `invalidOperator`, `circularDependency`
- **D-28:** admin FormPreview 에 `executeCalculations` 통합 (Phase 24.1 `DynamicCustomForm` 동일 로직)
- **D-29:** 미리보기에서 계산 결과 필드 disabled
- **D-30:** table row별 소계 표시 스코프 밖
- **D-31:** 저장 실패 UX — Phase 24 저장 버튼 스타일 동일 (disabled + 상단 에러 배너)

### Claude's Discretion
- 프리셋 버튼 정확한 Tailwind 스타일/아이콘
- 고급 모드 토글 UI (스위치 vs 링크)
- Σ 배지 아이콘 선택 (Sigma / Calculator / FunctionSquare)
- 공식 1줄 미리보기 truncation 길이
- 파서 에러 메시지 정확한 한국어 문구
- 프리셋 파라미터 드롭다운 배치(가로/세로)
- '고급 모드' 토글 레이블

### Deferred Ideas (OUT OF SCOPE)
- Table row별 소계 컬럼 자동 추가
- 추가 프리셋 (차, 곱, AVG, MAX)
- 계산 결과 포맷팅 (소수점, 천단위, 통화)
- 조건부 계산 (IF/THEN/ELSE)
- 타이핑 중 실시간 에러 힌트 (debounce)
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 25 는 `.planning/REQUIREMENTS.md` 에 아직 ID 가 부여되지 않은 상태이므로 CONTEXT.md `<domain>` 에서 암묵적 요구사항을 추출한다.

| ID | Description | Research Support |
|----|-------------|------------------|
| CALC-01 | 관리자가 number 필드에 자동 계산 공식을 설정할 수 있다 (프리셋 + 고급) | `CalculationRuleEditor` + `buildFormulaFromPreset` + FieldConfigEditor 섹션 |
| CALC-02 | 공식 변경 시 실시간 순환 의존성 감지 + 저장 차단 | `detectCircularDeps` + 인라인 배너 + `SchemaFieldEditor` 저장 버튼 disabled |
| CALC-03 | 미리보기에서 실시간 계산 결과 확인 | `FormPreview` 에 `executeCalculations` 통합 (Phase 24.1 `DynamicCustomForm` 패턴) |
| CALC-04 | 필드 삭제/타입 변경 시 관련 계산 규칙 자동 정리 | `cleanupCalcRulesForDeletedField` / `cleanupCalcRulesForTypeChange` + 토스트 |
| CALC-05 | 공식 파싱 에러 표시 (blur + 저장 시) | `validateFormula` + 인라인 에러 메시지 |
</phase_requirements>

## Standard Stack

이 Phase 는 **새 라이브러리 없이 기존 스택 100% 재사용**.

### Core (이미 설치됨)
| Library | Purpose | Verification |
|---------|---------|--------------|
| React 18 + TypeScript | UI | [VERIFIED: package.json] |
| react-hook-form + zod | 양식 저장 검증 | [VERIFIED: TemplateFormModal.tsx] |
| lucide-react | Σ / Plus / Trash2 아이콘 | [VERIFIED: Phase 24 ConditionalRuleEditor] |
| sonner | 자동 제거 토스트 | [VERIFIED: SchemaFieldEditor.tsx:61] |
| react-i18next | `admin` 네임스페이스 | [VERIFIED: Phase 24 i18n 키] |

### Alternatives Considered
| Instead of | Could Use | Rejected Because |
|------------|-----------|------------------|
| 커스텀 파서 작성 | mathjs, expr-eval | `executeCalculations.ts:99-219` 가 이미 독자 tokenizer/parser 보유, 신규 라이브러리는 과잉 |
| 프리셋 JSON schema | 하드코딩 `PRESET_OPTIONS` 상수 | 4종 고정이므로 상수가 더 명시적 |

## Architecture Patterns

### 파일 구조 변경
```
frontend/src/features/admin/components/
├── SchemaFieldEditor/
│   ├── CalculationRuleEditor.tsx     # NEW: 계산 규칙 편집 섹션 (프리셋+고급)
│   ├── calculationRuleUtils.ts       # NEW: 파서/프리셋 변환/검증/cascade 정리
│   ├── FieldCard.tsx                 # MODIFY: Σ 배지 + 공식 1줄 미리보기 + CalculationRuleEditor 호출
│   ├── FieldConfigEditor.tsx         # MODIFY: number 타입에 계산 섹션 삽입 (또는 FieldCard 에서 처리)
│   ├── SchemaFieldEditor.tsx         # MODIFY: calculationRules prop + cascade 정리
│   ├── types.ts                      # MODIFY: PresetType, PresetConfig, CalcValidationError 추가
│   └── constants.ts                  # MODIFY: PRESET_OPTIONS, CALC_SOURCE_TYPES 추가
├── FormPreview/
│   └── FormPreview.tsx               # MODIFY: executeCalculations 실시간 호출 + disabled 결과 필드
└── TemplateFormModal.tsx             # MODIFY: calculationRules state + line 157 하드코딩 제거 + 저장 검증
```

### Pattern 1: Phase 24 → Phase 25 1:1 대응 매핑

| Phase 24 자산 | Phase 25 대응 | 재사용 전략 |
|---|---|---|
| `ConditionalRuleEditor.tsx` (278 lines) | `CalculationRuleEditor.tsx` | 골격 복제: 빈 상태 → `handleAdd` → 편집 UI. 드롭다운 조합 대신 프리셋 라디오 + 파라미터 드롭다운 |
| `conditionalRuleUtils.ts::cleanupRulesForDeletedField` | `calculationRuleUtils.ts::cleanupCalcRulesForDeletedField` | `r.targetFieldId !== id && !r.dependsOn.includes(id) && !r.dependsOn.some(d => d.startsWith(id + '.'))` (D-07, table 컬럼 참조 `items.price` 감지) |
| `conditionalRuleUtils.ts::cleanupRulesForTypeChange` | `calculationRuleUtils.ts::cleanupCalcRulesForTypeChange` | 새 타입이 `number` 가 아니면 해당 필드가 타겟이거나 소스인 규칙 전부 제거. table 필드의 경우 컬럼 타입 변경도 감안해야 함 (Pitfall 3 참조) |
| `conditionalRuleUtils.ts::getAvailableSourceFields` | `calculationRuleUtils.ts::getAvailableCalcSources` | D-20/D-21 반영: 루트 number + table 내부 number 컬럼 (`{fieldId, columnId?}` 형태로 반환), 자기 자신 제외 |
| `constants.ts::OPERATORS_BY_TYPE` | `constants.ts::PRESET_OPTIONS` | 4종 프리셋 + 각 프리셋별 파라미터 메타 |
| `SchemaFieldEditor.tsx::updateField` cascade | 동일 위치 확장 | 기존 `cleanupRulesForTypeChange` 호출 라인(59) 바로 아래에 `cleanupCalcRulesForTypeChange` 추가 |
| `SchemaFieldEditor.tsx::deleteField` cascade | 동일 위치 확장 | line 84 옆에 calc 버전 추가 |
| `FieldCard.tsx::Zap 배지` (line 80-84) | `Sigma` 배지 추가 | 조건 배지 옆에 병렬 배치 |
| `FieldCard.tsx::ConditionalRuleEditor` 섹션 (line 167-197) | `CalculationRuleEditor` 섹션 | `field.type === 'number'` 조건 추가(D-19), 조건 섹션 아래에 병렬 배치 |
| `TemplateFormModal.tsx::invalidRules` 검증 (line 142-151) | 동일 위치 확장 | calc 용 validate + circular 검사 추가. line 157 `calculationRules: []` → `calculationRules: calculationRules` |

### Pattern 2: dependsOn 자동 추출 파서

**재사용 전략: `executeCalculations.ts:226-246` 의 `evaluateArithmetic` 내부 정규식을 공용 util 로 추출**

현재 `executeCalculations.ts:230` 에 동일 정규식(`/[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/g`)이 로컬 변수로 존재. Phase 25 에서는 이를 **재사용만** 하고 `executeCalculations.ts` 는 건드리지 않는 것을 권장한다(테스트/검증된 런타임 경로 훼손 방지).

```typescript
// frontend/src/features/admin/components/SchemaFieldEditor/calculationRuleUtils.ts
// Source: executeCalculations.ts:230 의 정규식을 복제 (D-23)
const FIELD_REF_PATTERN = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/g;
const RESERVED = new Set(['SUM']);

export function extractDependencies(formula: string): string[] {
  if (!formula) return [];
  const refs = new Set<string>();
  let m: RegExpExecArray | null;
  FIELD_REF_PATTERN.lastIndex = 0;
  while ((m = FIELD_REF_PATTERN.exec(formula)) !== null) {
    const token = m[0];
    if (RESERVED.has(token)) continue;
    // 순수 숫자 리터럴 제외 (정규식은 식별자만 매칭하지만 방어)
    if (/^\d/.test(token)) continue;
    refs.add(token);
  }
  return Array.from(refs);
}
```

### Pattern 3: 프리셋 ↔ 공식 양방향 변환

```typescript
// PresetType + PresetConfig 로 UI 상태 관리
export type PresetType = 'sum-col' | 'sum-mul' | 'field-sum' | 'ratio' | 'custom';

export interface PresetConfig {
  type: PresetType;
  // sum-col: { tableId, columnId }
  // sum-mul: { tableId, columnA, columnB }
  // field-sum: { fieldIds: string[] }
  // ratio: { numerator: string, denominator: string, multiplier?: number } // 기본 *100
  // custom: { raw: string }
  params: Record<string, unknown>;
}

export function buildFormulaFromPreset(preset: PresetConfig): string {
  switch (preset.type) {
    case 'sum-col':
      return `SUM(${preset.params.tableId}.${preset.params.columnId})`;
    case 'sum-mul':
      return `SUM(${preset.params.tableId}.${preset.params.columnA} * ${preset.params.tableId}.${preset.params.columnB})`;
    case 'field-sum':
      return (preset.params.fieldIds as string[]).join(' + ');
    case 'ratio':
      return `${preset.params.numerator} / ${preset.params.denominator} * 100`;
    case 'custom':
      return preset.params.raw as string;
  }
}

// D-18: 역방향 복원 — 엄격 매칭 (regex), 실패 시 'custom' 반환
export function parseFormulaToPreset(formula: string): PresetConfig {
  const trimmed = formula.trim();
  // sum-mul: SUM(X.a * X.b)
  const mulMatch = /^SUM\(\s*(\w+)\.(\w+)\s*\*\s*\1\.(\w+)\s*\)$/.exec(trimmed);
  if (mulMatch) return { type: 'sum-mul', params: { tableId: mulMatch[1], columnA: mulMatch[2], columnB: mulMatch[3] } };
  // sum-col: SUM(X.a)
  const colMatch = /^SUM\(\s*(\w+)\.(\w+)\s*\)$/.exec(trimmed);
  if (colMatch) return { type: 'sum-col', params: { tableId: colMatch[1], columnId: colMatch[2] } };
  // ratio: A / B * 100
  const ratioMatch = /^(\w+)\s*\/\s*(\w+)\s*\*\s*100$/.exec(trimmed);
  if (ratioMatch) return { type: 'ratio', params: { numerator: ratioMatch[1], denominator: ratioMatch[2] } };
  // field-sum: A + B (+ C ...)
  const sumMatch = /^(\w+)(\s*\+\s*\w+)+$/.exec(trimmed);
  if (sumMatch) return { type: 'field-sum', params: { fieldIds: trimmed.split(/\s*\+\s*/) } };
  return { type: 'custom', params: { raw: formula } };
}
```

### Pattern 4: admin FormPreview 실시간 계산 통합

**⚠️ 핵심 리스크 (Pitfall 5 참조):** 현재 `FormPreview.tsx:17` 은 외부 state 가 아닌 **자체 `useState`** 로 `formValues` 를 관리한다. Phase 24.1 `DynamicCustomForm.tsx:147-165` 의 `watchedKey + useEffect + form.setValue` 패턴은 **react-hook-form 기반**이며, 직접적인 이식은 불가능하다. 선택 2가지:

**옵션 A (권장, 최소 침습):** `FormPreview.tsx` 의 `setFormValues` 에 함수형 업데이트로 `executeCalculations` 통합
```typescript
// FormPreview.tsx 확장 (D-28, D-29)
const [formValues, setFormValues] = useState<Record<string, unknown>>({});

// 계산 결과를 formValues 에 반영 (useEffect 로 파생 상태 갱신)
useEffect(() => {
  const results = executeCalculations(calculationRules || [], formValues);
  // 무한 루프 방지: 변경사항이 있을 때만 업데이트
  const changed = Object.entries(results).some(
    ([fid, v]) => formValues[fid] !== v
  );
  if (changed) {
    setFormValues(prev => ({ ...prev, ...results }));
  }
}, [formValues, calculationRules]);

// 계산 결과 필드 집합 (PreviewFieldRenderer 에 disabled 전달)
const calcResultIds = useMemo(
  () => new Set((calculationRules || []).map(r => r.targetFieldId)),
  [calculationRules],
);
```

**옵션 B (더 큰 리팩터링):** `FormPreview` 를 react-hook-form 기반으로 전환. Phase 24.1 `DynamicCustomForm` 과 공유 hook (`useLiveFormEvaluator(schema, rules)`) 추출. → **Phase 25 스코프 확장이므로 비권장**.

**권장: 옵션 A**. 단, `PreviewFieldRenderer` 가 `disabled` prop 을 받도록 확장해야 한다 (현재는 지원하지 않음). `PreviewFieldRenderer.tsx:24-29` 의 props 에 `disabled?: boolean` 추가 → 내부 `DynamicFieldRenderer` 에 전달 (DynamicFieldRenderer 는 이미 `disabled` prop 보유, line 23).

### Pattern 5: 실시간 순환 감지 트리거

**권장: 전체 규칙 대상 호출**. `detectCircularDeps` 는 O(V+E), 50개 필드 × 1규칙 = 최대 50 노드 DFS. 증분 검사는 불필요한 복잡도.

```typescript
// CalculationRuleEditor 또는 부모에서
const cycles = useMemo(
  () => detectCircularDeps(calculationRules),
  [calculationRules],
);
const myFieldCycles = cycles.filter(c => c.includes(targetFieldId));
// 배너 표시: myFieldCycles.length > 0 일 때
// 저장 버튼 disabled: cycles.length > 0 일 때 (상위로 리프트)
```

**파생값 전파:** `cycles.length > 0` 을 `TemplateFormModal` 까지 올려서 저장 버튼 disabled 와 상단 에러 배너에 사용. Phase 24 의 `invalidRules` 검증 패턴과 동일 위치 (`onSubmit` line 140-151).

### Pattern 6: Σ 배지 + 공식 1줄 미리보기 렌더

`FieldCard.tsx:80-84` 의 `Zap` 배지 바로 옆에 `Sigma` 아이콘 추가 + 헤더 확장으로 공식 문자열(truncate) 표시.

```typescript
// 친화적 공식 렌더 유틸 (calculationRuleUtils.ts)
export function renderFormulaFriendly(formula: string): string {
  return formula.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ');
}

// FieldCard 헤더 (field.type === 'number' && rule 존재 시)
const myRule = calculationRules.find(r => r.targetFieldId === field.id);
{myRule && (
  <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded px-1.5 py-0.5 text-xs font-mono max-w-[200px] truncate">
    <Sigma className="w-3.5 h-3.5 shrink-0" />
    = {renderFormulaFriendly(myRule.formula)}
  </span>
)}
```

### Anti-Patterns to Avoid
- **`executeCalculations.ts` 건드리기:** 검증된 런타임 경로. util 추출은 admin 쪽에서 정규식 복제로 처리.
- **rule 개수 O(N²) 순환 검사:** `detectCircularDeps` 1회 호출로 전부 해결.
- **프리셋 상태와 `rule.formula` 이중 소스:** `rule.formula` 가 single source of truth. PresetConfig 는 파생 상태(`useMemo(() => parseFormulaToPreset(rule.formula))`).
- **onChange 시 에러 표시:** D-26 에 따라 blur 시점으로 제한.
- **table 내부 number 컬럼을 타겟으로 허용:** D-19 — 루트 number 만.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 계산 공식 실행 | 새 evaluator | `executeCalculations()` from `document/utils/executeCalculations.ts` | [VERIFIED] SUM + 사칙연산 + 컬럼 참조 + 체이닝 완전 구현 |
| 순환 감지 | Tarjan/Johnson 알고리즘 | `detectCircularDeps()` from `document/utils/detectCircularDeps.ts` | [VERIFIED] DFS 기반 O(V+E) 이미 완성 |
| 필드 레퍼런스 추출 | 직접 tokenizer | `executeCalculations.ts:230` 정규식 복제 | 동일 패턴 유지해야 런타임/편집 일관성 보장 |
| 필드 카드 배지 슬롯 | 새 컴포넌트 | `FieldCard.tsx:80-84` 의 기존 `Zap` 배지 옆에 병렬 배치 | Phase 24 패턴 그대로 |
| cascade 정리 토스트 | 직접 toast 호출 | `sonner::toast()` + `templates.calculation.rulesAutoRemoved` i18n 키 | Phase 24 와 동일 패턴 |

## Runtime State Inventory

**스코프 외 (순수 프론트엔드 컴포넌트 추가/수정).** Phase 25 는 DB 스키마/외부 서비스/OS 등록 상태를 건드리지 않는다. 
- 스토리지: None (브라우저 메모리만)
- 외부 서비스: None
- OS 등록: None
- 시크릿/env: None
- 빌드 artifact: `npm run build` dist 만 — 빌드 성공 여부로 회귀 감지

## Common Pitfalls

### Pitfall 1: `TemplateFormModal.tsx:157` 의 `calculationRules: []` 하드코딩
**What goes wrong:** 저장 시 calculationRules 가 항상 빈 배열로 기록 → 편집 재진입 시 규칙 소실.
**Why it happens:** Phase 22 에서 placeholder 로 넣어둔 라인. Phase 24 의 `conditionalRules: []` 하드코딩과 동일한 상황(Phase 24 에서 수정됨).
**How to avoid:** `calculationRules: calculationRules` 로 변경 + useState 추가 + line 95 영역에서 `setCalculationRules(schema.calculationRules || [])` 로드.
**Warning signs:** 규칙 저장 후 모달 재진입 시 Σ 배지 사라짐. [VERIFIED: TemplateFormModal.tsx:156-157]

### Pitfall 2: `FormPreview` 의 `useEffect` 무한 루프
**What goes wrong:** `executeCalculations` 결과를 `setFormValues` 로 반영 시 `formValues` 가 deps → 재실행 → 무한 루프.
**Why it happens:** 계산 결과가 `formValues` 에 포함되는 구조 특성.
**How to avoid:** (a) 변경 감지 early return (`changed` flag), (b) `JSON.stringify(formValues)` 를 dep 로 사용, (c) `executeCalculations` 가 `Number.isFinite` 로 NaN 방어 중이므로 안전. Phase 24.1 `DynamicCustomForm.tsx:148-165` 의 `watchedKey` 패턴이 이 문제를 RHF 기반으로 해결한 사례.
**Warning signs:** React dev tools 에서 FormPreview 무한 리렌더.

### Pitfall 3: table 필드 cascade — 내부 컬럼 타입 변경 감지 누락
**What goes wrong:** `items.price` 를 참조하는 계산 규칙이 있을 때, `items` table 의 `price` 컬럼 타입을 number → text 로 변경하면 규칙이 런타임 에러.
**Why it happens:** `cleanupCalcRulesForTypeChange` 는 필드 레벨 변경만 감지. TableColumnEditor 에서 컬럼 타입 변경은 `updateField` 의 `oldField.type === updated.type` 조건을 통과하므로 cascade 로직이 트리거되지 않음.
**How to avoid:** `SchemaFieldEditor.tsx::updateField` 에서 `oldField.type === 'table' && updated.type === 'table'` 인 경우 컬럼 diff 를 수행 → 타입 변경된 컬럼 참조하는 calc 규칙 제거. 또는 저장 시점 `validateFormula` 검증이 잡아내도록 보호망 설계.
**Warning signs:** 런타임에 `executeCalculations` 가 NaN 반환 (안전하게 0 처리되지만 UX 혼란).

### Pitfall 4: `schemaToZod` 가 계산 결과 필드에도 `min/max/required` 룰 적용
**What goes wrong:** D-29 에 따라 미리보기에서 계산 결과 필드 disabled → 사용자가 값을 입력 못 함 → required 검증 실패 가능.
**Why it happens:** `schemaToZod` 는 `FieldDefinition.required` 만 보고 zod 룰 생성. calculationRules 인지 없음.
**How to avoid:** Phase 24.1 `DynamicCustomForm.tsx:111-126` 의 `resolver` 커스터마이즈 패턴(hiddenFields 오버라이드)을 확인. 계산 결과 필드도 동일하게 resolver 에서 required=false 오버라이드 필요. **단 Phase 25 admin 미리보기는 zod 검증을 돌리지 않음** (`FormPreview` 는 `useForm` 없음) → 현재 스코프에서는 문제 없음. 하지만 사용자측 `DynamicCustomForm` 이 calc 결과 필드의 required 를 제외하는지 확인 필요 — **Phase 24.1 에서 이미 처리되었는지 검증 필요 항목**.
**Warning signs:** 사용자가 양식 제출 시 계산 결과 필드에 "필수 항목" 에러.

### Pitfall 5: `FormPreview` 가 react-hook-form 기반이 아니라 단순 useState 기반
**What goes wrong:** Phase 24.1 `DynamicCustomForm` 의 실시간 계산 패턴을 복붙하면 동작 안 함 (form.watch/setValue 가 없음).
**Why it happens:** `FormPreview.tsx:17` 은 `useState<Record<string, unknown>>({})` 직접 관리. `PreviewFieldRenderer` 는 내부에 자체 `useForm` 을 만들어 FormProvider 로 감싸고 watch 구독으로 외부 onChange 호출하는 어댑터 구조(PreviewFieldRenderer.tsx:42-67).
**How to avoid:** 옵션 A (위 Pattern 4 참조) — `useEffect` 로 `formValues` 에 파생 계산 반영. `PreviewFieldRenderer` 의 onChange 는 이미 외부 setFormValues 를 호출하므로 재귀가 자동으로 멈춘다 (변경 없으면 setState 생략됨).
**Warning signs:** 콘솔에 "Maximum update depth exceeded" warning.

### Pitfall 6: 프리셋 ↔ 고급 모드 전환 시 PresetConfig 유령 상태
**What goes wrong:** 사용자가 프리셋으로 공식 작성 → 고급 모드 전환 → 자유 편집 → 프리셋 모드 복귀 시 이전 프리셋 선택 상태가 복원되지만 `rule.formula` 와 불일치.
**Why it happens:** `PresetConfig` 를 로컬 state 로 들고 있으면 `rule.formula` 와 분리된다.
**How to avoid:** `PresetConfig` 는 **파생 상태**로만 유지 — `useMemo(() => parseFormulaToPreset(rule.formula), [rule.formula])`. 고급 모드 전환 여부는 별도 boolean state (`isAdvancedMode`). 프리셋 복귀 시 `parseFormulaToPreset` 결과가 `'custom'` 이면 경고 표시 후 프리셋 초기화 선택 유도.
**Warning signs:** 같은 규칙이 프리셋 탭에서는 A 로 보이고 고급 모드에서는 B 로 보임.

### Pitfall 7: 자기참조 차단이 drop-down 수준에서만 → 고급 모드에서 우회 가능
**What goes wrong:** 프리셋 UI 에서는 자기 자신 제외되지만, 고급 모드 자유입력으로 `totalAmount = totalAmount + 100` 작성 시 순환 발생.
**Why it happens:** 드롭다운 필터는 UI-only 방어선.
**How to avoid:** `validateFormula` 에서 `extractDependencies(formula).includes(targetFieldId)` 체크 + blur/저장 시 `unknownField` 과 별도로 `selfReference` 에러 분기. 또는 `detectCircularDeps` 가 자동으로 감지하므로(자기 자신으로의 엣지 = 길이 1 사이클) 순환 배너만으로 충분할 수도 있음 — **`detectCircularDeps` 가 self-loop 를 감지하는지 확인 필요** (`detectCircularDeps.ts:42-50` 참조: `visiting` 상태에서 다시 방문 시 cycle push 하므로 self-loop 도 감지됨). [VERIFIED]

## Code Examples

### CalculationRuleEditor 컴포넌트 골격

```typescript
// frontend/src/features/admin/components/SchemaFieldEditor/CalculationRuleEditor.tsx
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Sigma } from 'lucide-react';
import { toast } from 'sonner';
import type { CalculationRule } from '../../../document/types/dynamicForm';
import type { SchemaField } from './types';
import { SMALL_INPUT_CLASS } from './constants';
import {
  extractDependencies,
  buildFormulaFromPreset,
  parseFormulaToPreset,
  validateFormula,
  getAvailableCalcSources,
  renderFormulaFriendly,
  type PresetType,
} from './calculationRuleUtils';

interface Props {
  targetFieldId: string;
  rule: CalculationRule | undefined;
  allFields: SchemaField[];
  allRules: CalculationRule[];
  cycles: string[][]; // D-24: 상위에서 계산된 cycles 전달
  onAddRule: (rule: CalculationRule) => void;
  onUpdateRule: (rule: CalculationRule) => void;
  onDeleteRule: () => void;
}

export function CalculationRuleEditor({ targetFieldId, rule, allFields, allRules, cycles, onAddRule, onUpdateRule, onDeleteRule }: Props) {
  const { t } = useTranslation('admin');
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [rawInput, setRawInput] = useState(rule?.formula ?? '');
  const [blurError, setBlurError] = useState<string | null>(null);

  const presetConfig = useMemo(
    () => (rule ? parseFormulaToPreset(rule.formula) : null),
    [rule],
  );

  const myCycles = useMemo(
    () => cycles.filter(c => c.includes(targetFieldId)),
    [cycles, targetFieldId],
  );

  const handleAdd = () => {
    const sources = getAvailableCalcSources(targetFieldId, allFields);
    if (sources.length === 0) {
      toast(t('templates.calculation.noSourceFields'));
      return;
    }
    // 기본값: 첫 번째 table 컬럼이 있으면 sum-col, 없으면 field-sum
    const firstTable = sources.find(s => s.columnId);
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
        <button type="button" onClick={handleAdd} className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800">
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

  const handleAdvancedBlur = () => {
    const err = validateFormula(rawInput, allFields, targetFieldId);
    setBlurError(err);
    if (!err) updateFormula(rawInput);
  };

  return (
    <div className="space-y-3">
      {/* 모드 토글 */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setIsAdvanced(false)} className={!isAdvanced ? 'font-semibold' : ''}>{t('templates.calculation.presetMode')}</button>
        <button type="button" onClick={() => setIsAdvanced(true)} className={isAdvanced ? 'font-semibold' : ''}>{t('templates.calculation.advancedMode')}</button>
      </div>

      {/* 프리셋 영역 */}
      {!isAdvanced && presetConfig && (
        <PresetSelector
          config={presetConfig}
          allFields={allFields}
          targetFieldId={targetFieldId}
          onConfigChange={(next) => updateFormula(buildFormulaFromPreset(next))}
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
            placeholder="예: SUM(items.price * items.qty) * 1.1"
          />
          {blurError && <p className="mt-1 text-xs text-red-600">{t(`templates.calculation.errors.${blurError}`)}</p>}
        </div>
      )}

      {/* 1줄 미리보기 */}
      <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
        = {renderFormulaFriendly(rule.formula)}
      </div>

      {/* D-24: 순환 경고 배너 */}
      {myCycles.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded px-3 py-2 text-xs text-red-700 dark:text-red-300">
          ⚠ {t('templates.calculation.errors.circularDependency')}: {myCycles[0].join(' → ')}
        </div>
      )}

      <button type="button" onClick={onDeleteRule} className="text-red-500 hover:text-red-700">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### validateFormula

```typescript
export function validateFormula(
  formula: string,
  allFields: SchemaField[],
  targetFieldId: string,
): string | null {
  if (!formula.trim()) return 'emptyFormula';
  // 괄호 매칭
  let depth = 0;
  for (const ch of formula) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return 'syntaxError';
  }
  if (depth !== 0) return 'syntaxError';

  const deps = extractDependencies(formula);
  for (const dep of deps) {
    const [fieldId, columnId] = dep.split('.');
    const field = allFields.find(f => f.id === fieldId);
    if (!field) return 'unknownField';
    if (columnId) {
      if (field.type !== 'table') return 'unknownField';
      const col = (field.config.columns || []).find(c => c.id === columnId);
      if (!col) return 'unknownColumn';
      if (col.type !== 'number') return 'unknownColumn';
    } else {
      if (field.type !== 'number') return 'unknownField';
    }
  }
  return null;
}
```

### i18n 키 구조 (추가 예정)

```json
{
  "templates": {
    "calculation": {
      "sectionTitle": "계산 규칙",
      "noRule": "계산 규칙이 없습니다",
      "addRule": "계산 추가",
      "deleteRule": "계산 삭제",
      "presetMode": "프리셋",
      "advancedMode": "고급 모드",
      "noSourceFields": "계산 소스로 사용 가능한 숫자 필드가 없습니다",
      "rulesAutoRemoved": "계산 규칙 {{count}}개가 자동 제거되었습니다",
      "validationError": "계산 규칙에 오류가 있습니다",
      "presets": {
        "sumCol": "컬럼 합계",
        "sumMul": "컬럼 곱 합계",
        "fieldSum": "필드 합",
        "ratio": "비율"
      },
      "errors": {
        "unknownField": "존재하지 않는 필드 참조",
        "unknownColumn": "존재하지 않는 컬럼 또는 숫자 타입 아님",
        "syntaxError": "공식 구문 오류 (괄호 불일치 등)",
        "emptyFormula": "공식이 비어 있습니다",
        "invalidOperator": "잘못된 연산자",
        "circularDependency": "순환 참조 감지"
      }
    }
  }
}
```

## Environment Availability

순수 프론트엔드 작업 — 외부 의존성 없음. `npm run build` 성공 여부만 확인.

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node/npm | 빌드 | ✓ | (기존) | — |
| React/TypeScript/lucide-react/sonner/react-i18next | UI | ✓ | (기존) | — |

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | 없음 (프로젝트에 test runner 미설치) |
| Quick run command | `npm run build` (타입 에러 감지) |
| Full suite command | 수동 UAT |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Command | File Exists? |
|---|---|---|---|---|
| CALC-01 | 프리셋 4종으로 공식 생성 | manual | 수동 UAT | N/A |
| CALC-02 | 순환 감지 + 저장 차단 | manual | 수동 UAT | N/A |
| CALC-03 | 미리보기 실시간 계산 | manual | 수동 UAT | N/A |
| CALC-04 | cascade 정리 | manual | 수동 UAT | N/A |
| CALC-05 | 파싱 에러 표시 | manual | 수동 UAT | N/A |

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** 수동 체크 — 양식 편집 → 계산 규칙 추가/삭제/미리보기 실행
- **Phase gate:** 빌드 성공 + 5개 암묵 요구사항 수동 검증

### Wave 0 Gaps
- 테스트 프레임워크 미설치 → 자동 테스트 불가. 순수 유틸(`extractDependencies`, `buildFormulaFromPreset`, `parseFormulaToPreset`, `validateFormula`)은 단위 테스트 대상 우선 순위 높음 but out of scope.

## Open Questions

1. **Phase 24.1 `DynamicCustomForm` 이 calc 결과 필드의 required 검증을 이미 제외하는가?**
   - What we know: `DynamicCustomForm.tsx:111-126` 의 resolver 는 `hiddenFields` 만 오버라이드
   - What's unclear: calculationRules 의 `targetFieldId` 는 disabled 이지만 required 오버라이드는 안 보임
   - Recommendation: plan 단계에서 실제 확인. 필요 시 resolver 확장 task 추가 (Pitfall 4).

2. **`executeCalculations.ts:230` 정규식을 공용 util 로 extract 할지, admin 쪽에서 복제할지**
   - What we know: 동일 정규식이 두 곳에서 필요
   - What's unclear: 추출 시 `executeCalculations.ts` 테스트 회귀 리스크
   - Recommendation: **복제 권장**. 런타임 경로 훼손 방지. 주석으로 `// Source-synced with executeCalculations.ts:230` 명시.

3. **프리셋 '비율' 의 `* 100` 이 기본값인가, 선택인가?**
   - What we know: D-15 예시 `A / B * 100`
   - What's unclear: 사용자가 `* 1000` 으로 변경 가능 여부
   - Recommendation: MVP 는 `* 100` 하드코딩. 추후 프리셋 파라미터에 multiplier 드롭다운 추가.

## Plan Structure Suggestion

다음 3개 plan 으로 분할 권장 (CONTEXT.md next_steps 와 일관):

### `25-01-PLAN.md`: 타입/상수/유틸 — "엔진 기초"
- `types.ts` 확장: `PresetType`, `PresetConfig`, `CalcValidationError`, `CalcSource`
- `constants.ts` 확장: `PRESET_OPTIONS`, `CALC_SOURCE_TYPES = ['number']`, `CALC_RESERVED_WORDS = ['SUM']`
- `calculationRuleUtils.ts` 신설:
  - `extractDependencies(formula)`
  - `buildFormulaFromPreset(preset)`
  - `parseFormulaToPreset(formula)`
  - `validateFormula(formula, fields, targetFieldId)`
  - `getAvailableCalcSources(targetFieldId, allFields)` — 루트 number + table.number 컬럼 반환
  - `cleanupCalcRulesForDeletedField(id, rules)`
  - `cleanupCalcRulesForTypeChange(id, newType, rules)`
  - `renderFormulaFriendly(formula)`
- `admin.json` (ko) i18n 키 추가: `templates.calculation.*` 네임스페이스 전체
- 빌드 통과 확인

### `25-02-PLAN.md`: 편집 UI 컴포넌트 — "편집기"
- `CalculationRuleEditor.tsx` 신설 (위 골격 기반)
  - Sub-component: `PresetSelector` (4종 분기, 파라미터 드롭다운)
  - Advanced 모드 input + blur 검증 + 에러 표시
  - 순환 배너 렌더 (cycles prop 수신)
- `FieldCard.tsx` 수정:
  - `field.type === 'number'` 일 때 `CalculationRuleEditor` 섹션 렌더
  - Σ 배지 + 1줄 미리보기 헤더 추가
  - 신규 props: `calculationRules`, `onAddCalcRule`, `onUpdateCalcRule`, `onDeleteCalcRule`, `cycles`
- `SchemaFieldEditor.tsx` 수정:
  - `calculationRules`/`onCalculationRulesChange` prop 추가
  - `updateField` 에 `cleanupCalcRulesForTypeChange` 호출 추가 (line 58-64 옆)
  - `deleteField` 에 `cleanupCalcRulesForDeletedField` 호출 추가 (line 83-89 옆)
  - table 컬럼 타입 변경 cascade (Pitfall 3) — 필요 시 추가 task
  - `cycles = detectCircularDeps(calculationRules)` useMemo → FieldCard 로 전달
- `TemplateFormModal.tsx` 수정:
  - `calculationRules` useState 추가
  - line 95 영역에서 `setCalculationRules(schema.calculationRules || [])` 로드
  - line 140-151 onSubmit 에 calc 검증 추가 (`validateFormula` + `detectCircularDeps`)
  - line 157 하드코딩 `calculationRules: []` → `calculationRules`
  - SchemaFieldEditor / FormPreview 에 prop 전달
  - 저장 버튼 disabled (cycles.length > 0)

### `25-03-PLAN.md`: 미리보기 통합 + UAT
- `FormPreview.tsx` 수정:
  - `calculationRules` prop 추가
  - `useEffect` 로 `executeCalculations` 호출 → setFormValues 병합 (변경 감지 가드)
  - `calcResultIds` set 생성 → `PreviewFieldRenderer` 에 `disabled` 전달
- `PreviewFieldRenderer.tsx` 수정:
  - `disabled?: boolean` prop 추가 → 내부 `DynamicFieldRenderer` 로 pass-through
- 수동 UAT 체크리스트:
  - [ ] 프리셋 4종 각각 공식 생성 확인
  - [ ] 고급 모드 자유입력 blur 검증 동작
  - [ ] 순환 참조 시 양방향 배너 + 저장 disabled
  - [ ] 필드 삭제/타입 변경 시 cascade 토스트
  - [ ] 미리보기 실시간 계산 결과 반영
  - [ ] 계산 결과 필드 disabled 확인
  - [ ] Σ 배지 + 1줄 미리보기 헤더 표시
  - [ ] Phase 24 조건 규칙과 공존 동작
  - [ ] 편집 모드 재진입 시 규칙 복원 (Pitfall 1)
  - [ ] table 컬럼 참조 `items.price` 공식 저장/로드

## Project Constraints (from CLAUDE.md)

- **GSD 워크플로 enforce:** 모든 파일 수정은 `/gsd:execute-phase` 경로 통해야 함
- **TypeScript strict, Tailwind 기반 UI, 한국어 응답** (`feedback_korean_response`)
- **기존 기능 보존** (`feedback_preserve_existing`): Phase 24 조건 규칙 UI, Phase 22 split layout, Phase 24.1 `DynamicCustomForm` 경로가 깨지지 않아야 함
- **Lombok 금지, Java records 선호** — 백엔드 미관련
- **Dynamic form builder 금지** — 이 Phase 는 builder 가 아닌 **규칙 편집** UI 이므로 OK
- **양식 템플릿은 hardcoded React components** — CUSTOM 렌더러는 Phase 24.1 에서 예외 허용됨

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | `detectCircularDeps` 는 self-loop 감지 | Pitfall 7 | [검증: detectCircularDeps.ts:42-50 path indexOf 로직상 self-edge 도 cycle push 함 — VERIFIED 로 업그레이드 가능] |
| A2 | Phase 24.1 `DynamicCustomForm` 의 resolver 가 calc 결과 필드의 required 를 오버라이드하지 않음 | Pitfall 4 | 계산 결과 필드에 사용자측 제출 시 "필수" 에러 — plan 단계 추가 검증 필요 |
| A3 | `FormPreview` 옵션 A(useEffect + setFormValues)가 무한 루프 없이 동작 | Pattern 4 | 옵션 B(RHF 전환)로 scope creep. 변경 감지 가드로 방어 가능 |
| A4 | table 내부 컬럼 타입 변경 시 cascade 가 현재 없음 | Pitfall 3 | 고아 규칙 잔존 — `validateFormula` 가 저장 시 잡아주므로 치명적이지 않음 |
| A5 | 프로젝트에 `Sigma` lucide 아이콘이 포함됨 | Pattern 6 | 대체: `Calculator` 또는 `FunctionSquare` — Claude's Discretion |

## Sources

### Primary (HIGH confidence — 실제 코드 읽음)
- `frontend/src/features/document/types/dynamicForm.ts:60-64` — `CalculationRule { targetFieldId, formula, dependsOn[] }`
- `frontend/src/features/document/utils/executeCalculations.ts:226-246` — `evaluateArithmetic` 정규식 `/[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/g`
- `frontend/src/features/document/utils/executeCalculations.ts:45` — `SUM_PATTERN`
- `frontend/src/features/document/utils/executeCalculations.ts:260-291` — `executeCalculations` 시그니처 + merged values 체이닝
- `frontend/src/features/document/utils/detectCircularDeps.ts:12-74` — DFS 기반 사이클 검출 + path indexOf
- `frontend/src/features/admin/components/SchemaFieldEditor/ConditionalRuleEditor.tsx` (278 lines) — 레퍼런스 패턴
- `frontend/src/features/admin/components/SchemaFieldEditor/conditionalRuleUtils.ts:10-69` — cleanup 패턴
- `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts:61-83` — 상수 추가 지점
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx:80-84, 167-197` — 배지/섹션 추가 지점
- `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx:57-96` — updateField/deleteField cascade 지점
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx:55-111` — number case 확장 여부 검토
- `frontend/src/features/admin/components/SchemaFieldEditor/types.ts:56-69` — helper 타입 확장 위치
- `frontend/src/features/admin/components/FormPreview/FormPreview.tsx:15-66` — 미리보기 프레임워크
- `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx:24-84` — 어댑터 구조 (외부 useState ↔ 내부 useForm)
- `frontend/src/features/admin/components/TemplateFormModal.tsx:49, 95, 142-157, 368, 424` — calc state/검증/전달 지점
- `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx:145-175` — `watchedKey` 기반 실시간 계산 패턴
- `frontend/src/features/document/components/dynamic/DynamicFieldRenderer.tsx:14-26` — disabled prop 보유 확인

### Secondary (HIGH — 문서)
- `.planning/phases/25-calculation-rule-ui/25-CONTEXT.md` — D-01~D-31 locked decisions
- `.planning/phases/24-ui/24-CONTEXT.md` + `24-RESEARCH.md` — 레퍼런스 패턴
- `.planning/phases/24.1-custom-dynamicformrenderer/24.1-RESEARCH.md` / `24.1-CONTEXT.md` — 실시간 계산 inherit 지점
- `CLAUDE.md` — 프로젝트 제약

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 새 라이브러리 없이 기존 스택 재사용
- Architecture: HIGH — Phase 24 1:1 대응 + 실제 파일/라인 확인
- Pitfalls: HIGH — 7개 항목 실제 코드 기반 (Pitfall 1~7)
- Plan 구조: HIGH — CONTEXT.md next_steps 와 일관

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (프론트엔드 전용, 외부 의존성 없음)
