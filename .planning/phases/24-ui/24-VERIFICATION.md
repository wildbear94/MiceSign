---
phase: 24-ui
verified: 2026-04-12T20:00:00+09:00
status: human_needed
score: 10/10 must-haves verified (automated)
overrides_applied: 0
gaps:
human_verification:
  - test: "조건 규칙 설정 UI 전체 동작 확인 (CND-01)"
    expected: |
      1. 필드 설정 패널에서 '조건 규칙' 섹션이 접기/펼치기로 열린다
      2. '조건 추가' 클릭 시 IF [필드] [연산자] [값] THEN [액션] 드롭다운 4개가 표시된다
      3. select 필드 선택 시 연산자가 eq/neq/in/notIn/isEmpty/isNotEmpty로 필터링된다
      4. 'in' 연산자 선택 시 체크박스 목록이 나타난다
      5. 규칙 설정 후 필드카드 헤더에 번개(Zap) 아이콘 배지가 표시된다
      6. 자기참조 필드가 소스 드롭다운에서 제외된다
    why_human: "드롭다운 필터링 동작, 배지 렌더링, 체크박스 목록 UI는 브라우저 인터랙션 없이 자동 검증 불가"
  - test: "미리보기 인터랙티브 동작 확인 (D-16~D-20)"
    expected: |
      1. 미리보기 패널의 모든 필드(text/textarea/number/date/select)가 disabled 없이 값 입력 가능
      2. 소스 필드에 값 입력 시 타겟 필드가 즉시 표시/숨김 전환된다
      3. require 액션 충족 시 필드 레이블 옆에 빨간 * 표시가 나타난다
      4. '초기화' 버튼 클릭 시 모든 입력값이 리셋되고 모든 필드가 표시된다
      5. 초기화 버튼은 conditionalRules가 1개 이상 있을 때만 표시된다
    why_human: "DOM 인터랙션, 값 변경 후 조건 재평가 결과는 브라우저 없이 확인 불가"
  - test: "필드 삭제/타입 변경 시 규칙 자동 정리 확인 (CND-02)"
    expected: |
      1. 소스 필드 삭제 시 해당 필드를 조건 소스로 참조하는 규칙이 제거되고 '조건 규칙 N개가 자동 제거되었습니다' 토스트가 표시된다
      2. 타겟 필드 삭제 시에도 동일하게 양방향 정리 + 토스트
      3. text -> staticText 등 소스 불가 타입으로 변경 시 해당 필드를 소스로 참조하는 규칙 제거 + 토스트
    why_human: "window.confirm 모달, 토스트 알림 표시는 브라우저 없이 확인 불가"
  - test: "저장/로드 라운드트립 확인"
    expected: |
      1. 조건 규칙 설정 후 저장 시 schemaDefinition JSON에 conditionalRules 배열이 포함된다
      2. 양식 재편집 시 기존 conditionalRules가 로드되어 표시된다
      3. 전체화면 미리보기에서도 conditionalRules 기반 조건이 동작한다
    why_human: "API 저장/응답, 편집 모드 로드는 실제 서버 연동 없이 확인 불가"
---

# Phase 24: 조건부 표시 규칙 UI 검증 보고서

**Phase 목표:** 관리자가 필드 간 조건부 표시/숨김 관계를 직관적으로 설정할 수 있다
**검증일시:** 2026-04-12T20:00:00+09:00
**상태:** human_needed
**재검증:** 아니오 (최초 검증)

---

## 목표 달성 여부

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 관리자가 필드별 설정 패널에서 조건 탭을 열어 IF-THEN 규칙을 설정할 수 있다 | ✓ VERIFIED | FieldCard.tsx: `conditionExpanded` state, `ConditionalRuleEditor` 렌더링, `aria-expanded` 접기/펼치기 섹션 구현 확인 |
| 2 | 설정된 조건 규칙이 미리보기 패널에서 동작하여 필드 표시/숨김이 실시간 확인된다 | ✓ VERIFIED | FormPreview.tsx: `evaluateConditions` 호출, `hiddenFields.has(f.id)` 필터, `formValues` state 관리, `RotateCcw` 초기화 버튼 구현 확인 |
| 3 | 필드 삭제 시 해당 필드를 참조하는 조건 규칙이 자동으로 정리되며, 사용자에게 알림이 표시된다 | ✓ VERIFIED | SchemaFieldEditor.tsx: `cleanupRulesForDeletedField` + `toast(t('templates.condition.rulesAutoRemoved'))` 구현 확인 |

**Score:** 3/3 Roadmap SC 검증됨

### Plan must_haves (Plan 01: 7개 + Plan 02: 7개)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P1-1 | 관리자가 필드 설정 패널에서 접기/펼치기 조건 규칙 섹션을 열 수 있다 | ✓ VERIFIED | FieldCard.tsx L43 `conditionExpanded`, L171 `aria-expanded`, ChevronRight 회전 구현 |
| P1-2 | IF [필드] [연산자] [값] THEN [액션] 드롭다운 조합으로 조건을 설정할 수 있다 | ✓ VERIFIED | ConditionalRuleEditor.tsx: source field select, operator select, value input, action select 4개 드롭다운 구현 |
| P1-3 | 소스 필드 타입에 따라 연산자 목록이 필터링된다 | ✓ VERIFIED | ConditionalRuleEditor.tsx L69: `OPERATORS_BY_TYPE[sourceType]` 적용 |
| P1-4 | 자기참조 및 순환참조가 드롭다운에서 차단된다 | ✓ VERIFIED | conditionalRuleUtils.ts: `getAvailableSourceFields`에서 자기참조(D-12) + 순환참조(D-13) 차단 로직 |
| P1-5 | 필드 삭제 시 관련 조건 규칙이 양방향으로 자동 정리되고 토스트가 표시된다 | ✓ VERIFIED | SchemaFieldEditor.tsx L78-88: `cleanupRulesForDeletedField` + `removedCount > 0` 시 toast |
| P1-6 | 소스 필드 타입 변경 시 관련 규칙이 자동 제거되고 토스트가 표시된다 | ✓ VERIFIED | SchemaFieldEditor.tsx L57-64: `cleanupRulesForTypeChange` + `removedCount > 0` 시 toast |
| P1-7 | 규칙이 설정된 필드카드 헤더에 Zap 아이콘 배지가 표시된다 | ✓ VERIFIED | FieldCard.tsx L80-84: `conditionalRules.some(r => r.targetFieldId === field.id)` 조건 + `bg-amber-100 text-amber-700` Zap 배지 |
| P2-1 | TemplateFormModal이 conditionalRules 상태를 관리하고 SchemaFieldEditor와 FormPreview에 전달한다 | ✓ VERIFIED | TemplateFormModal.tsx L49: `useState<ConditionalRule[]>`, L368: `onConditionalRulesChange={setConditionalRules}`, L424: `conditionalRules={conditionalRules}` |
| P2-2 | 편집 모드에서 기존 conditionalRules가 schemaDefinition에서 로드된다 | ✓ VERIFIED | TemplateFormModal.tsx L95: `setConditionalRules(schema.conditionalRules \|\| [])` |
| P2-3 | 저장 시 conditionalRules가 schemaDefinition JSON에 포함된다 (하드코딩 [] 제거) | ✓ VERIFIED | TemplateFormModal.tsx L156: `conditionalRules: conditionalRules` (하드코딩 [] 제거 확인) |
| P2-4 | 미리보기에서 모든 필드가 입력 가능한 인터랙티브 모드로 동작한다 | ✓ VERIFIED | PreviewFieldRenderer.tsx: ENABLED_INPUT_CLASS 사용, text/textarea/number/date/select 모두 disabled 없음, value+onChange 연결 |
| P2-5 | 미리보기에서 조건 충족 시 필드가 즉시 표시/숨김/필수 전환된다 | ✓ VERIFIED | FormPreview.tsx L19-22: `evaluateConditions` → `hiddenFields`/`requiredFields`, L53: `!hiddenFields.has(f.id)` 필터링, L57: `dynamicRequired={requiredFields.has(field.id)}` |
| P2-6 | 미리보기 상단에 초기화 버튼이 있고 클릭 시 모든 formValues가 리셋된다 | ✓ VERIFIED | FormPreview.tsx L39-50: `conditionalRules.length > 0` 조건부 표시, `onClick={() => setFormValues({})}` |
| P2-7 | 저장 시 유효성 검증이 실패하면 에러 토스트가 표시되고 저장이 차단된다 | ✓ VERIFIED | TemplateFormModal.tsx L141-151: `invalidRules` 검증 + `toast.error(t('templates.condition.validationError'))` + `return` |

**Score:** 10/10 must-haves 검증됨 (자동화 가능 범위)

---

## 필수 아티팩트

| 아티팩트 | 제공 기능 | 상태 | 세부사항 |
|---------|---------|------|---------|
| `frontend/src/features/admin/components/SchemaFieldEditor/ConditionalRuleEditor.tsx` | 조건 규칙 편집 UI 컴포넌트 | ✓ VERIFIED | 278줄, `getAvailableSourceFields`, `OPERATORS_BY_TYPE`, `ACTION_OPTIONS`, `templates.condition.noRule` 포함 |
| `frontend/src/features/admin/components/SchemaFieldEditor/conditionalRuleUtils.ts` | 규칙 정리 유틸 함수 | ✓ VERIFIED | `cleanupRulesForDeletedField`, `cleanupRulesForTypeChange`, `getAvailableSourceFields` 3개 export |
| `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` | OPERATORS_BY_TYPE, ACTION_OPTIONS 상수 | ✓ VERIFIED | L61-85에 조건 규칙 상수 추가됨 (단 중복 import 문제 존재 — 아래 anti-patterns 참조) |
| `frontend/src/features/admin/components/TemplateFormModal.tsx` | conditionalRules 상태 관리 + 저장 + 유효성 검증 | ✓ VERIFIED | `const [conditionalRules` state, 저장 payload, 검증 로직 모두 구현 |
| `frontend/src/features/admin/components/FormPreview/FormPreview.tsx` | 인터랙티브 미리보기 + evaluateConditions 호출 | ✓ VERIFIED | `evaluateConditions` import, `formValues` state, `hiddenFields`/`requiredFields` 적용 |
| `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx` | 입력 가능 필드 렌더링 + onChange 콜백 | ✓ VERIFIED | ENABLED_INPUT_CLASS, `onChange` prop, `dynamicRequired` prop 모두 구현 |

---

## 핵심 링크 검증

| From | To | Via | Status | 세부사항 |
|------|-----|-----|--------|---------|
| `SchemaFieldEditor.tsx` | `conditionalRuleUtils.ts` | `import cleanupRulesForDeletedField, cleanupRulesForTypeChange` | ✓ WIRED | L9 확인, deleteField/updateField에서 호출 |
| `FieldCard.tsx` | `ConditionalRuleEditor.tsx` | 접기/펼치기 섹션 내 렌더링 | ✓ WIRED | L10 import, L184 `<ConditionalRuleEditor>` 렌더링 |
| `ConditionalRuleEditor.tsx` | `conditionalRuleUtils.ts` | `import getAvailableSourceFields` | ✓ WIRED | L7 import, L31 handleAdd에서 호출 |
| `TemplateFormModal.tsx` | `SchemaFieldEditor` | `conditionalRules + onConditionalRulesChange props` | ✓ WIRED | L368-369 확인 |
| `TemplateFormModal.tsx` | `FormPreview` | `conditionalRules prop` | ✓ WIRED | L424 확인 |
| `FormPreview.tsx` | `evaluateConditions` | `import from document/utils/evaluateConditions` | ✓ WIRED | L6 import, L19 호출 |
| `FormPreview.tsx` | `PreviewFieldRenderer` | `value + onChange props` | ✓ WIRED | L55-61 확인 |

---

## 데이터 흐름 추적 (Level 4)

| 아티팩트 | 데이터 변수 | 데이터 소스 | 실제 데이터 흐름 | 상태 |
|---------|-----------|-----------|----------------|------|
| `FormPreview.tsx` | `formValues` | `PreviewFieldRenderer.onChange` 콜백 | 사용자 입력 → `setFormValues(prev => ({...prev, [field.id]: val}))` → `evaluateConditions` 재평가 | ✓ FLOWING |
| `FormPreview.tsx` | `conditionalRules` | `TemplateFormModal` prop 전달 | Modal state → SchemaFieldEditor 편집 → Modal → FormPreview | ✓ FLOWING |
| `TemplateFormModal.tsx` | `conditionalRules` | useState 초기화 + 편집모드 `schema.conditionalRules` 로드 | `JSON.stringify({...conditionalRules: conditionalRules})` 저장 payload에 포함 | ✓ FLOWING |

---

## 동작 스팟 체크 (Step 7b)

테스트 프레임워크가 미설치된 프로젝트이므로 TypeScript 컴파일 결과로 대체합니다.

| 동작 | 명령 | 결과 | 상태 |
|------|------|------|------|
| TypeScript 타입 검사 (`--noEmit`) | `npx tsc --noEmit` | Exit 0 (오류 없음) | ✓ PASS |
| 프로덕션 빌드 (`tsc -b`) | `npm run build` | FAIL — 빌드 에러 존재 | ✗ FAIL |

---

## 요구사항 커버리지

| 요구사항 | 소스 플랜 | 설명 | 상태 | 근거 |
|---------|---------|------|------|------|
| CND-01 | Plan 01, Plan 02 | 관리자가 필드별 조건부 표시/숨김 규칙을 설정할 수 있다 (IF 필드 = 값 THEN 표시/숨김/필수/선택) | ✓ 충족 (자동화 범위) | ConditionalRuleEditor + FieldCard 배지 + SchemaFieldEditor 통합. 브라우저 동작은 human 검증 필요 |
| CND-02 | Plan 01 | 필드 삭제 시 해당 필드를 참조하는 규칙이 자동 정리된다 | ✓ 충족 (자동화 범위) | `cleanupRulesForDeletedField`, `cleanupRulesForTypeChange` + toast 구현. 토스트 표시는 human 검증 필요 |

---

## Anti-Patterns

| 파일 | 라인 | 패턴 | 심각도 | 영향 |
|------|------|------|--------|------|
| `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` | 3, 63 | `import type { SchemaFieldType }` 중복 선언 | 🛑 Blocker | `npm run build` (tsc -b) 실패 — 프로덕션 빌드 불가. `npx tsc --noEmit`은 통과하나 이는 incremental 캐시 차이로 인한 것으로, 실제 배포 빌드는 깨진 상태 |

**주의:** SUMMARY.md는 "pre-existing tsc -b build errors"로 표기했으나, git 이력 분석 결과 **이 중복 import 에러는 Phase 24-01 커밋(`e18ecd3`)에서 새로 도입됨** (Phase 23 마지막 커밋 `ffc2a44`에서는 단일 import였음).

**pre-existing으로 확인된 에러 (Phase 23에서 기인):**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 타입 선언 없음 — package.json에 의존성 선언되었으나 `node_modules` 미설치
- `ExpenseForm.tsx` unused import — Phase 24와 무관

**수정 방법:** `constants.ts` 라인 63의 `import type { SchemaFieldType, ComparisonOperator, ActionOption } from './types';`를 라인 3의 기존 import와 병합:
```typescript
import type { SchemaFieldType, TableColumnType, ComparisonOperator, ActionOption } from './types';
```

---

## 인간 검증 필요 항목

### 1. 조건 규칙 설정 UI 전체 동작 확인 (CND-01)

**테스트 방법:** `cd frontend && npm run dev` 실행 후 관리자 계정으로 양식 관리 페이지 → 양식 생성/편집 모달 → 필드 추가 → 필드 설정 펼치기 → '조건 규칙' 섹션 클릭

**기대 결과:**
- 접기/펼치기 섹션이 열리고 '조건 규칙이 없습니다' + '조건 추가' 버튼 표시
- '조건 추가' 클릭 시 IF-THEN 드롭다운 4개 표시
- select 소스 필드 선택 시 연산자가 eq/neq/in/notIn/isEmpty/isNotEmpty로 필터링
- 'in' 연산자 시 체크박스 목록 표시
- 규칙 설정 후 헤더에 번개(Zap) 아이콘 배지 표시
- 자기참조 필드가 소스 드롭다운에서 제외됨

**왜 인간 검증이 필요한가:** 드롭다운 필터링 동작, 배지 렌더링, 체크박스 목록 UI는 브라우저 인터랙션 없이 자동 검증 불가

### 2. 미리보기 인터랙티브 동작 확인 (D-16~D-20)

**테스트 방법:** 양식 편집 모달 우측 미리보기 패널에서 필드 값 입력 시도

**기대 결과:**
- text/textarea/number/date/select 필드 모두 값 입력 가능 (disabled 없음)
- 소스 필드에 값 입력 → 타겟 필드 즉시 표시/숨김 전환
- require 액션 충족 시 빨간 * 표시
- '초기화' 버튼 클릭 → 모든 값 리셋, 모든 필드 표시

**왜 인간 검증이 필요한가:** DOM 인터랙션 및 조건 재평가 결과는 브라우저 없이 확인 불가

### 3. 필드 삭제/타입 변경 시 규칙 자동 정리 확인 (CND-02)

**테스트 방법:** 조건 규칙 설정 후 소스 또는 타겟 필드를 삭제, 또는 소스 필드 타입을 staticText로 변경

**기대 결과:**
- '조건 규칙 N개가 자동 제거되었습니다' 토스트 표시
- 규칙이 해당 필드 참조 없이 정리됨

**왜 인간 검증이 필요한가:** window.confirm 모달, 토스트 알림 표시는 브라우저 없이 확인 불가

### 4. 저장/로드 라운드트립 확인

**테스트 방법:** 조건 규칙 설정 후 저장, 재편집 모달 열기

**기대 결과:**
- 저장된 schemaDefinition JSON에 `conditionalRules` 배열 포함
- 재편집 시 기존 규칙 표시됨
- 전체화면 미리보기에서도 조건 동작

**왜 인간 검증이 필요한가:** API 저장/로드는 실제 서버 연동 없이 확인 불가

---

## 갭 요약

자동화 검증 범위에서 10개 must-haves 모두 통과했습니다.

**유일한 자동화 검증 실패 항목:** `npm run build`(tsc -b) 빌드 실패 — `constants.ts` 중복 `SchemaFieldType` import로 인한 `TS2300` 에러. 이 에러는 Phase 24-01 작업 중 발생했으나 `npx tsc --noEmit`은 통과하므로 IDE/개발 환경에서는 즉시 드러나지 않았습니다. 프로덕션 배포 시 빌드가 실패하므로 배포 전 반드시 수정이 필요합니다.

수정 방법: `constants.ts` 상단 두 개의 `import type { SchemaFieldType, ... }`를 하나로 병합.

---

_검증일: 2026-04-12T20:00:00+09:00_
_Verifier: Claude (gsd-verifier)_
