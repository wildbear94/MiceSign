---
phase: 25-calculation-rule-ui
verified: 2026-04-13T15:00:00Z
status: human_needed
score: 3/3
overrides_applied: 0
human_verification:
  - test: "프리셋 4종 (SUM 컬럼, 컬럼 곱 합계, 필드합, 비율) 공식 자동 생성 동작 확인"
    expected: "각 프리셋 선택 시 올바른 formula 문자열이 생성되고 CalculationRuleEditor 에 표시됨"
    why_human: "실제 브라우저에서 드롭다운 인터랙션, 상태 파생 동작은 코드 정적 분석으로 완전 검증 불가"
  - test: "미리보기 실시간 계산 + disabled 필드 (UAT Section 8)"
    expected: "items 테이블 row 입력 시 total 필드가 즉시 계산값으로 갱신, total 입력 비활성화"
    why_human: "React 런타임 상태 전이 및 무한 루프 부재(Pitfall 2)는 DevTools 에서만 확인 가능"
---

# Phase 25: 계산 규칙 UI Verification Report

**Phase Goal:** 관리자가 숫자 필드에 자동 계산 공식을 설정하고 오류를 사전에 방지할 수 있다
**Verified:** 2026-04-13T15:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 관리자가 숫자 필드의 설정 패널에서 계산 탭을 열어 공식을 설정할 수 있다 (SUM, 사칙연산, 테이블 컬럼 참조) | VERIFIED | `CalculationRuleEditor.tsx` 442 LoC; 프리셋 4종 분기(`sum-col`, `sum-mul`, `field-sum`, `ratio`) 코드 확인. `FieldCard.tsx` 에 `calcExpanded` 토글 + `CalculationRuleEditor` 렌더링. `TemplateFormModal` 에서 `calculationRules` 상태 → `SchemaFieldEditor` → `FieldCard` prop drilling 완성 |
| 2 | 설정된 계산 공식이 미리보기 패널에서 실시간 계산 결과를 보여준다 | VERIFIED (코드) / HUMAN_NEEDED (런타임 동작) | `FormPreview.tsx` 에 `useEffect` + `executeCalculations` 호출 + 변경 감지 가드(`changed` flag) 존재 확인. `calcResultIds Set` 으로 disabled pass-through 구현. 무한 루프 부재는 브라우저에서 검증 필요 |
| 3 | 순환 의존성 설정 시 실시간 경고가 표시되고 저장이 차단된다 | VERIFIED | `SchemaFieldEditor` 에 `useMemo(() => detectCircularDeps(calculationRules))` 존재. `CalculationRuleEditor` 에 `myCycles` 필터링 + 인라인 배너 렌더링. `TemplateFormModal.onSubmit` 에서 `detectCircularDeps` + `validateFormula` 재검증 후 토스트 + abort. 저장 버튼 `disabled={hasCalcErrors}` + tooltip |

**Score:** 3/3 truths verified (truth 2 에 human_needed 포함)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/features/admin/components/SchemaFieldEditor/calculationRuleUtils.ts` | 9개 함수 export (파서/프리셋/검증/cascade/렌더) | VERIFIED | 246 LoC. `extractDependencies`, `buildFormulaFromPreset`, `parseFormulaToPreset`, `validateFormula`, `getAvailableCalcSources`, `cleanupCalcRulesForDeletedField`, `cleanupCalcRulesForTypeChange`, `cleanupCalcRulesForTableColumnChange`, `renderFormulaFriendly` 전부 export 확인 |
| `frontend/src/features/admin/components/SchemaFieldEditor/CalculationRuleEditor.tsx` | 프리셋 + 고급 모드 + 순환 배너 컴포넌트 | VERIFIED | 442 LoC. `isAdvanced` state, `presetConfig` useMemo, `myCycles` 필터, `PresetSelector` sub-component, 4종 preset 분기 전부 확인 |
| `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` | `PresetType`, `PresetConfig`, `CalcSource`, `CalcValidationError`, `SchemaFieldEditorProps` 확장 | VERIFIED | 모든 타입 존재. `SchemaFieldEditorProps` 에 `calculationRules?: CalculationRule[]`, `onCalculationRulesChange?` 추가됨 |
| `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` | `PRESET_OPTIONS` 4종, `CALC_RESERVED_WORDS` | VERIFIED | `PRESET_OPTIONS` 4종 (`sum-col`, `sum-mul`, `field-sum`, `ratio`), `CALC_RESERVED_WORDS = new Set(['SUM'])`, `CALC_TARGET_TYPES`, `CALC_SOURCE_ROOT_TYPES` 모두 존재 |
| `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx` | Σ 배지 + 공식 미리보기 + CalculationRuleEditor 호스팅 | VERIFIED | `Sigma` 아이콘 import, `calcExpanded` 토글, `CalculationRuleEditor` 렌더링, `renderFormulaFriendly` 사용, `hasCalcCycle` 로 배지 색상 분기 확인 |
| `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx` | detectCircularDeps useMemo + 3종 cascade 호출 | VERIFIED | `detectCircularDeps` import, `const cycles = useMemo(...)`, `cleanupCalcRulesForTypeChange`, `cleanupCalcRulesForTableColumnChange`, `cleanupCalcRulesForDeletedField` 세 분기 확인 |
| `frontend/src/features/admin/components/TemplateFormModal.tsx` | calculationRules 상태 + 저장/로드 + 검증 + prop drilling | VERIFIED | `useState<CalculationRule[]>([])` 신규 state. `calculationRules: calculationRules` (Pitfall 1 fix — `[]` 하드코딩 없음). `detectCircularDeps` + `validateFormula` onSubmit 검증. FormPreview/FullscreenPreviewPortal 양쪽에 prop 전달(L400, L461, L475) |
| `frontend/src/features/admin/components/FormPreview/FormPreview.tsx` | executeCalculations useEffect + calcResultIds + disabled | VERIFIED | `executeCalculations` import, `calculationRules?: CalculationRule[]` prop, `useEffect` + 변경 감지 가드, `calcResultIds useMemo`, `disabled={calcResultIds.has(field.id)}` pass-through 확인 |
| `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx` | disabled prop pass-through | VERIFIED | `disabled?: boolean` props 인터페이스, `<DynamicFieldRenderer ... disabled={disabled} />` 전달 확인 |
| `frontend/src/features/admin/components/FormPreview/FullscreenPreviewPortal.tsx` | calculationRules prop 전달 | VERIFIED | `calculationRules?: CalculationRule[]` props, `<FormPreview ... calculationRules={calculationRules} />` 전달 확인 |
| `frontend/public/locales/ko/admin.json` | `templates.calculation.*` 네임스페이스 (ko) | VERIFIED | `sectionTitle: "계산 규칙"`, presets 15키, errors 7키 (`circularDependency: "순환 참조 감지"` 포함) 확인 |
| `frontend/public/locales/en/admin.json` | `templates.calculation.*` 네임스페이스 (en) | VERIFIED | `sectionTitle: "Calculation Rules"` 포함 동일 구조 확인 |
| `.planning/phases/25-calculation-rule-ui/25-UAT.md` | 48개 체크박스 / 10 섹션 / sign-off | VERIFIED | 파일 존재. 10 섹션(프리셋/고급모드/순환/저장로드/배지/삭제cascade/타입변경/미리보기/회귀/payload). Sign-off 섹션: `[x] 모든 항목 통과 → "approved"`, 승인일 2026-04-13 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `calculationRuleUtils.ts::extractDependencies` | `executeCalculations.ts:230 정규식` | `FIELD_REF_PATTERN = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/g` (복제) | VERIFIED | 양측 정규식 문자 단위 동일. `Source-synced with executeCalculations.ts:230` 주석 존재. `lastIndex = 0` 리셋으로 T-25-02 대응 |
| `TemplateFormModal.tsx` | `SchemaFieldEditor.tsx` | `calculationRules={calculationRules}` + `onCalculationRulesChange={setCalculationRules}` | VERIFIED | 상태 prop drilling 완성 |
| `SchemaFieldEditor.tsx` | `FieldCard.tsx` | calc 관련 5개 prop (`calculationRules`, `cycles`, `onAddCalcRule`, `onUpdateCalcRule`, `onDeleteCalcRule`) | VERIFIED | FieldCard 렌더 호출부에서 확인 |
| `FieldCard.tsx` | `CalculationRuleEditor.tsx` | `calcExpanded` 토글 → 렌더 | VERIFIED | `{calcExpanded && <CalculationRuleEditor ... />}` 확인 |
| `FormPreview.tsx` | `executeCalculations` | `useEffect([formValues, calculationRules]) → setFormValues patch` | VERIFIED | 변경 감지 early-return 가드 포함 |
| `PreviewFieldRenderer.tsx` | `DynamicFieldRenderer` | `disabled={disabled}` pass-through | VERIFIED | props → `<DynamicFieldRenderer ... disabled={disabled} />` 확인 |
| `FullscreenPreviewPortal.tsx` | `FormPreview.tsx` | `calculationRules={calculationRules}` | VERIFIED | 전달 확인 |
| `TemplateFormModal.tsx` | `FormPreview.tsx` + `FullscreenPreviewPortal` | `calculationRules` prop (L400, L461, L475) | VERIFIED | 양쪽 컴포넌트 호출부 모두 전달 확인 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `FormPreview.tsx` | `formValues` (계산 결과 포함) | `executeCalculations(calculationRules, formValues)` → `setFormValues` patch | Yes — 실제 계산 엔진 호출 (non-empty formValues 기반) | FLOWING |
| `TemplateFormModal.tsx` | `calculationRules` | `useState` → `setCalculationRules(schema.calculationRules || [])` (edit load), `onCalculationRulesChange` (editor) | Yes — API 응답 또는 사용자 편집 값 | FLOWING |
| `TemplateFormModal.tsx` JSON payload | `calculationRules: calculationRules` | 위 state 직접 참조 (Pitfall 1 fix) | Yes — 빈 배열 하드코딩 제거됨 | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript 빌드 | `npx tsc --noEmit` | EXIT: 0 (no errors) | PASS |
| `calculationRuleUtils.ts` 9개 export 존재 | 파일 직접 검사 | 전부 확인 | PASS |
| `FIELD_REF_PATTERN` 동일성 | `executeCalculations.ts:230` vs `calculationRuleUtils.ts:20` | `/[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/g` 문자 단위 동일 | PASS |
| Pitfall 1 fix (hardcoded `[]` 제거) | `grep "calculationRules: \[\]"` TemplateFormModal | 매칭 없음 | PASS |
| 런타임 파일 미수정 | `git log -- executeCalculations.ts detectCircularDeps.ts` | Phase 25 커밋 목록에 없음 | PASS |
| 미리보기 실시간 계산 | 브라우저 에서만 가능 | — | HUMAN_NEEDED |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| CAL-01 | 관리자가 숫자 필드에 계산 공식을 설정할 수 있다 (SUM, 사칙연산, 테이블 컬럼 참조) | SATISFIED | `CalculationRuleEditor` 프리셋 4종 + 고급 모드 자유입력. `buildFormulaFromPreset` SUM/사칙연산/테이블 컬럼 참조 지원. `validateFormula` blur 시 검증. `TemplateFormModal` 에서 `calculationRules: calculationRules` 저장/로드 완성 |
| CAL-02 | 순환 의존성 감지 시 실시간 경고가 표시된다 | SATISFIED | `SchemaFieldEditor` `useMemo(detectCircularDeps)`. `CalculationRuleEditor` 인라인 배너(myCycles). `FieldCard` Σ 배지 빨간색 전환. `TemplateFormModal` onSubmit 차단 + 저장 버튼 disabled |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `SchemaFieldEditor.tsx:67` | L67 | `t('templates.condition.rulesAutoRemoved', ...)` — 조건 규칙 제거 토스트 키를 계산 규칙 제거에도 재사용 | Info | 토스트 문구가 "계산 규칙 N개가 자동 제거되었습니다" 대신 "조건 규칙..." 으로 표시될 수 있음. 단, 계산 규칙 cascade 분기(L80)는 올바른 `templates.calculation.rulesAutoRemoved` 키 사용. 조건 규칙 분기(L67)는 Phase 24 코드 — Phase 25 스코프 밖 |

안티패턴 중 Phase 25 블로커 수준의 항목은 없음.

---

## Human Verification Required

### 1. FormPreview 실시간 계산 동작 (UAT Section 8)

**Test:** items 테이블에 price=100/qty=2, price=200/qty=3 로 행 입력 후 total 필드 값 확인
**Expected:** total 필드에 800 이 자동 계산되어 표시. total 입력 필드가 disabled 상태(회색). React DevTools Console 에 "Maximum update depth exceeded" 경고 없음
**Why human:** `useEffect` 무한 루프 부재(Pitfall 2)는 브라우저 React DevTools 로만 확인 가능. useState 기반 렌더 사이클은 정적 분석으로 검증 불가

### 2. 프리셋 4종 UI 인터랙션 (UAT Section 1)

**Test:** CalculationRuleEditor 에서 각 프리셋 탭 클릭 → 드롭다운 선택 → 공식 자동 생성
**Expected:** sum-col: `SUM(items.price)`, sum-mul: `SUM(items.price * items.qty)`, field-sum: `priceA + priceB + priceC`, ratio: `priceA / priceB * 100`
**Why human:** 드롭다운 onConfigChange → buildFormulaFromPreset → onUpdateRule 체인의 실제 상태 흐름은 브라우저에서만 확인 가능. 코드 연결은 검증됨

---

## 검증 요약

Phase 25의 3개 성공 기준이 모두 코드 레벨에서 확인되었습니다:

1. **CAL-01 (계산 공식 설정):** `CalculationRuleEditor` 프리셋 4종 + 고급 모드, `calculationRuleUtils.ts` 9개 순수 함수, `TemplateFormModal` 저장/로드 Pitfall 1 픽스 완료
2. **CAL-02 (순환 의존성 차단):** `detectCircularDeps` useMemo, 인라인 배너, Σ 배지 빨간색, 저장 버튼 disabled — 3단 방어 구조 확인
3. **미리보기 실시간 계산:** `FormPreview` `useEffect` + `executeCalculations` + `changed` 가드 코드 확인. 런타임 동작(무한 루프 부재)은 UAT에서 사용자 확인 완료(2026-04-13 "approved" sign-off)

UAT sign-off가 이미 완료되었으나(48개 항목 전부 통과), 본 자동화 검증 프로세스에서 브라우저 실행 없이는 런타임 동작을 독립적으로 재확인할 수 없어 `human_needed` 상태로 분류합니다. 인간 검증자가 UAT 결과를 신뢰하고 수락하면 `passed`로 전환 가능합니다.

**런타임 파일 불변성:** `executeCalculations.ts`, `detectCircularDeps.ts` 는 Phase 25 전체 커밋 목록에서 수정되지 않음 — 회귀 위험 없음.

---

_Verified: 2026-04-13T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
