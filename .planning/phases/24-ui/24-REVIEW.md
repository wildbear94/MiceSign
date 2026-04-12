---
phase: 24-ui
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - frontend/public/locales/en/admin.json
  - frontend/public/locales/ko/admin.json
  - frontend/src/features/admin/components/FormPreview/FormPreview.tsx
  - frontend/src/features/admin/components/FormPreview/FullscreenPreviewPortal.tsx
  - frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/ConditionalRuleEditor.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/conditionalRuleUtils.ts
  - frontend/src/features/admin/components/SchemaFieldEditor/constants.ts
  - frontend/src/features/admin/components/SchemaFieldEditor/types.ts
  - frontend/src/features/admin/components/TemplateFormModal.tsx
findings:
  critical: 0
  warning: 7
  info: 5
  total: 12
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-04-12
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

이번 리뷰는 조건부 표시 규칙(Conditional Rules) UI 구현 전체를 대상으로 합니다.
구현 범위는 SchemaFieldEditor, ConditionalRuleEditor, PreviewFieldRenderer, FormPreview, FullscreenPreviewPortal, TemplateFormModal 및 i18n 파일입니다.

전반적으로 코드 구조는 명확하고 비즈니스 로직(D-0x 규칙)이 잘 반영되어 있습니다. 그러나 다음과 같은 주요 문제가 발견되었습니다:

- `constants.ts` 파일 내 ES 모듈 규칙 위반 (파일 중간에 duplicate import)
- `number` 타입의 `in`/`notIn` 연산자가 UI상 동작하지 않는 silent logic failure
- Escape 키 이벤트가 fullscreen preview를 닫을 때 모달 전체도 닫히는 버그
- i18n 파일 간 키 불일치 (영문 locale에 `sidebar.templates`, `registration` 섹션 누락)
- `en/admin.json`에 중복 JSON 키 (`noLabel`)

---

## Warnings

### WR-01: `constants.ts` — 파일 중간에 duplicate `import type` 선언 (ES 모듈 위반)

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts:63-64`

**Issue:** 파일 상단(lines 1-2)에서 이미 `react`와 `./types`를 import한 이후, 파일 중간 line 63-64에서 동일 모듈(`./types`)을 다시 import하고 있습니다. ES 모듈 스펙에서 import 선언은 모듈 최상위에 위치해야 하며, 코드 블록 이후에는 올 수 없습니다. TypeScript와 번들러(Vite)에 따라 에러 없이 처리될 수도 있으나 lint(ESLint `import/first` 규칙 등)는 이를 오류로 잡습니다. 실제로 첫 번째 import 블록에서 `SchemaFieldType` 등이 이미 사용되고 있으므로 두 번째 import는 완전히 중복입니다.

**Fix:** 두 번째 import 블록(lines 63-64)을 제거하고, 필요한 타입들을 파일 상단의 기존 import에 통합:

```typescript
// constants.ts 상단에 모든 import를 통합
import type React from 'react';
import {
  Type, AlignLeft, Hash, Calendar, List, FileText, EyeOff, Table, HelpCircle, CheckSquare,
} from 'lucide-react';
import type { SchemaFieldType, TableColumnType, ComparisonOperator, ActionOption } from './types';

// line 63-64의 중복 import 블록 삭제
```

---

### WR-02: Escape 키 이벤트 — fullscreen 종료 시 모달 전체도 닫히는 버그

**File:** `frontend/src/features/admin/components/TemplateFormModal.tsx:114-125`

**Issue:** `TemplateFormModal`은 `document.addEventListener('keydown', handleKeyDown)` (bubble phase)로 Escape를 처리하고, `FullscreenPreviewPortal`은 `document.addEventListener('keydown', handleKeyDown, true)` (capture phase)로 처리합니다. fullscreen이 열린 상태에서 Escape를 누르면:
1. capture phase: Portal의 핸들러 → `e.stopPropagation()` 호출 후 `onClose()` (fullscreen 닫힘)
2. bubble phase: Modal의 핸들러도 실행됨 → `isFullscreen`이 이미 `false`가 아닌 경우 `onClose()` 호출 → **모달 전체가 닫힘**

`stopPropagation()`은 동일 phase의 전파만 막으며, capture phase에서 호출해도 bubble phase 리스너는 막지 못합니다.

**Fix:** Modal의 Escape 핸들러에서 `isFullscreen` 상태를 확인하거나, Portal에서 `e.stopImmediatePropagation()`을 추가합니다. Modal 측이 더 안전한 수정 위치입니다:

```typescript
// TemplateFormModal.tsx
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isFullscreen) {
      setIsFullscreen(false);
      e.stopPropagation();
      return; // 모달 onClose() 호출 방지
    }
    onClose();
  }
}
```

현재 코드에는 이미 `if (isFullscreen)` 분기가 있으나 `return`이 없어 `else onClose()`가 실행되는 버그가 있습니다. `isFullscreen` 분기 후 명시적으로 `return`이 필요합니다.

---

### WR-03: `number` 타입의 `in`/`notIn` 연산자 — UI 미구현으로 조건이 항상 false

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/ConditionalRuleEditor.tsx:132-210`

**Issue:** `constants.ts`의 `OPERATORS_BY_TYPE.number`에 `'in'`과 `'notIn'`이 포함되어 있어(line 74) 사용자가 이를 선택할 수 있습니다. 그러나 `renderValueInput()`에서 `in`/`notIn`용 checkbox 리스트는 `sourceType === 'select'`인 경우에만 렌더링됩니다 (line 138). `number` 타입에서 `in`/`notIn`을 선택하면 단일 텍스트 입력이 렌더링되어 사용자가 하나의 값을 입력합니다. `evaluateConditions.ts`에서는 `conditionValue`가 배열이 아닌 경우 빈 배열로 처리하여 (line 47) 조건이 **항상 false**가 됩니다.

두 가지 선택지:
- (권장) `OPERATORS_BY_TYPE.number`에서 `'in'`과 `'notIn'`을 제거
- 또는 number 타입 `in`/`notIn`을 위한 쉼표 구분 입력 UI를 추가하고 배열로 파싱

**Fix (권장 — 연산자 제거):**

```typescript
// constants.ts
export const OPERATORS_BY_TYPE: Record<string, ComparisonOperator[]> = {
  text:   ['eq', 'neq', 'isEmpty', 'isNotEmpty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'], // in/notIn 제거
  date:   ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'],
  select: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
};
```

---

### WR-04: `TemplateFormModal` — 편집 대상 변경 시 `conditionalRules` 상태 누수

**File:** `frontend/src/features/admin/components/TemplateFormModal.tsx:89-103`

**Issue:** 모달이 열린 상태에서 편집 대상 템플릿이 바뀔 때 (예: 목록에서 다른 항목 선택), 두 번째 `useEffect`(line 89)의 의존성에 `editingTemplate`이 포함되어 있어 재실행됩니다. 그런데 `detailQuery.data`가 아직 이전 템플릿 데이터를 캐시하고 있다면, 새 템플릿을 열었는데 이전 템플릿의 `conditionalRules`가 그대로 표시되는 상황이 발생합니다. 첫 번째 `useEffect`(line 69)는 `editingTemplate`이 없을 때만 `setConditionalRules([])`를 호출하므로 edit→edit 전환 시에는 초기화되지 않습니다.

**Fix:** 첫 번째 `useEffect`에서 `editingTemplate`이 변경될 때마다 이전 schema 상태를 즉시 초기화:

```typescript
useEffect(() => {
  if (open) {
    if (editingTemplate) {
      reset({ ... });
      // 상세 쿼리 로드 전 schema 초기화 (stale data 방지)
      setSchemaFields([]);
      setConditionalRules([]);
    } else {
      reset({ ... });
      setSchemaFields([]);
      setConditionalRules([]);
    }
    setActiveTab('info');
  }
}, [open, editingTemplate, reset]);
```

---

### WR-05: `conditionalRuleUtils.ts` — 순환 참조 감지가 1단계만 처리

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/conditionalRuleUtils.ts:54-69`

**Issue:** `getAvailableSourceFields`는 직접 순환(A를 source로 하는 규칙의 target들을 B의 source 후보에서 제외)만 막습니다. 3개 이상의 필드가 관여하는 경우 (A→B, B→C, C→A) 를 막지 못합니다: C의 source로 A를 선택할 때 `fieldsTargetingMe`(A를 source로 하는 규칙의 targetId = B만 포함)에 C가 없으므로 A→C 규칙이 허용됩니다.

현재 구현에서 `evaluateConditions`는 단순 선형 순회라 무한루프는 없지만, 미래에 실시간 반응형 평가가 추가되면 문제가 됩니다. 또한 비직관적인 규칙 상태(C가 A에 의존하지만 A는 B에 의존하고 B는 C에 의존)를 사용자에게 허용하는 것은 UX상 문제입니다.

**Fix:** BFS/DFS로 전이적 의존성을 추적:

```typescript
export function getAvailableSourceFields(
  targetFieldId: string,
  allFields: SchemaField[],
  rules: ConditionalRule[],
): SchemaField[] {
  // targetFieldId가 직간접적으로 source로 사용하는 모든 field ID 수집
  const dependsOnTarget = new Set<string>();
  const queue = [targetFieldId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const r of rules) {
      if (r.condition.fieldId === current && !dependsOnTarget.has(r.targetFieldId)) {
        dependsOnTarget.add(r.targetFieldId);
        queue.push(r.targetFieldId);
      }
    }
  }

  return allFields.filter(f =>
    f.id !== targetFieldId &&
    CONDITION_SOURCE_TYPES.includes(f.type as any) &&
    !dependsOnTarget.has(f.id)
  );
}
```

---

### WR-06: `en/admin.json` — 중복 JSON 키 `"noLabel"`

**File:** `frontend/public/locales/en/admin.json:163,188`

**Issue:** `"templates"` 객체 안에 `"noLabel"` 키가 두 번 선언되어 있습니다 (line 163과 line 188). JSON 스펙(RFC 8259)은 객체 내 중복 키를 금지하며, 파서마다 동작이 다릅니다 (대부분 마지막 값 사용). 현재 두 값이 동일하여 런타임 문제는 없으나, ESLint `jsonc` 플러그인이나 JSON schema validation에서 오류로 잡힙니다.

**Fix:** line 188의 중복 `"noLabel"` 항목 삭제:

```json
// line 188 삭제 (line 163의 것만 유지)
```

---

### WR-07: `SchemaFieldEditor.tsx` — `onConditionalRulesChange` 미제공 시 규칙 편집 UI가 노출되나 변경이 무시됨

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx:160-165`

**Issue:** `onConditionalRulesChange`는 optional prop이며, 미제공 시 `?.()` optional chaining으로 silently no-op 처리됩니다. 그러나 컴포넌트는 `conditionalRules` prop이 있으면 항상 `ConditionalRuleEditor`를 렌더링합니다. 사용자가 규칙을 추가/수정해도 상태가 실제로 저장되지 않고, 이에 대한 피드백도 없습니다.

현재 `TemplateFormModal`에서는 항상 두 prop을 모두 전달하므로 실제 버그는 없지만, 컴포넌트 API 계약이 불명확합니다.

**Fix:** 두 prop을 묶어 함께 required로 처리하거나, 미제공 시 conditional rule UI를 렌더링하지 않도록 처리:

```typescript
// FieldCard.tsx에서 조건 추가
{!CONDITION_EXCLUDED_TARGET_TYPES.includes(field.type) && onConditionalRulesChange && (
  // ... ConditionalRuleEditor 렌더링
)}
```

---

## Info

### IN-01: `en/admin.json` — `sidebar.templates` 키 누락

**File:** `frontend/public/locales/en/admin.json:69-73`

**Issue:** 한국어 locale에는 `"sidebar": { ..., "templates": "양식 관리" }` 가 있지만 영문 locale의 `sidebar` 섹션에 `"templates"` 키가 없습니다. 영문 locale 사용자의 사이드바 "Templates" 메뉴가 번역 key 문자열로 표시됩니다.

**Fix:**
```json
"sidebar": {
  "departments": "Departments",
  "positions": "Positions",
  "users": "Users",
  "templates": "Templates"
}
```

---

### IN-02: `en/admin.json` — `registration` 섹션 전체 누락

**File:** `frontend/public/locales/en/admin.json`

**Issue:** 한국어 locale에는 `"registration"` 네임스페이스(등록 신청 관리 관련 텍스트 약 40개 키)가 있으나 영문 locale에 완전히 없습니다. 영문 locale에서 등록 신청 관리 화면 접근 시 모든 텍스트가 key 문자열로 표시됩니다.

**Fix:** 영문 locale에 `registration` 섹션을 한국어 locale과 동일한 구조로 추가하고 영어 번역 제공.

---

### IN-03: `FieldCard.tsx` — 이동 버튼 tooltip이 한국어 하드코딩

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx:93,100`

**Issue:** `title="위로 이동"`과 `title="아래로 이동"`이 i18n 처리 없이 한국어로 하드코딩되어 있습니다. 파일의 다른 모든 사용자 대면 문자열은 `t()` 함수를 사용합니다.

**Fix:**
```typescript
// i18n 키 추가 후
title={t('templates.moveUp')}  // "위로 이동"
title={t('templates.moveDown')} // "아래로 이동"
```

---

### IN-04: `PreviewFieldRenderer.tsx` — `number` 필드 onChange가 문자열을 반환

**File:** `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx:44-45`

**Issue:** number 입력의 `onChange`가 `e.target.value`(string 타입)를 그대로 `formValues`에 저장합니다. `evaluateConditions.ts`에서 `gt`/`gte`/`lt`/`lte` 연산자는 `Number()` 변환으로 처리되고 `eq`/`neq`는 loose equality(`==`)로 처리되어 런타임 동작은 올바르지만, 타입 불일치가 암묵적 의존성을 만듭니다.

**Fix:**
```typescript
onChange={(e) => onChange?.(e.target.value === '' ? '' : Number(e.target.value))}
```

---

### IN-05: `TemplateFormModal.tsx` — 닫기 버튼 `aria-label`이 한국어 하드코딩

**File:** `frontend/src/features/admin/components/TemplateFormModal.tsx:238`

**Issue:** `aria-label="닫기"`가 i18n 처리 없이 한국어로 하드코딩되어 있습니다.

**Fix:**
```tsx
aria-label={t('common.close')}
```

---

_Reviewed: 2026-04-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
