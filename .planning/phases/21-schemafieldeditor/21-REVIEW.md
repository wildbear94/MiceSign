---
phase: 21-schemafieldeditor
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - frontend/src/features/admin/components/SchemaFieldEditor/types.ts
  - frontend/src/features/admin/components/SchemaFieldEditor/constants.ts
  - frontend/src/features/admin/components/SchemaFieldEditor/utils.ts
  - frontend/src/features/admin/components/SchemaFieldEditor/TypeBadge.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/index.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-04-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

SchemaFieldEditor는 양식 템플릿 스키마를 편집하는 컴포넌트 모음으로, 필드 추가/이동/삭제, 타입별 설정 편집 기능을 갖추고 있습니다. 전체적인 구조는 깔끔하고 타입 안전성도 잘 유지되어 있습니다.

그러나 몇 가지 주의해야 할 버그와 잠재적 문제점이 발견되었습니다. 가장 중요한 것은 `id` 중복 허용 문제 — 동일한 `label`에서 파생된 `id`를 가진 필드가 여러 개 생성되면 React 키 충돌과 제출 시 데이터 덮어쓰기가 발생할 수 있습니다. `toFieldId` 유틸리티의 빈 문자열 반환 가능성도 함께 살펴봐야 합니다.

---

## Warnings

### WR-01: 필드 id 중복 검사 없음 — React 키 충돌 및 데이터 손실 위험

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx:122`

**Issue:** 사용자가 필드 ID를 직접 수정할 수 있는 입력란(line 122)이 있습니다. 그러나 중복 ID를 방지하는 검사가 없습니다. `SchemaFieldEditor.tsx:115`에서 `key={field.id}`로 렌더링하기 때문에, 두 필드가 동일한 `id`를 갖게 되면 React 내부 상태가 혼동됩니다. 또한 이 스키마가 JSON으로 직렬화되어 백엔드로 전송될 때 동일 id를 가진 필드 데이터가 유실(덮어쓰기)될 가능성이 있습니다.

**Fix:** `updateField` 또는 `onUpdate` 핸들러에서 id 중복 여부를 체크하거나, ID 입력 필드 하단에 즉각적인 인라인 경고를 표시하세요.

```tsx
// SchemaFieldEditor.tsx - updateField 내에서 검사
const updateField = (index: number, updated: SchemaField) => {
  const isDuplicate = fields.some(
    (f, i) => i !== index && f.id === updated.id
  );
  if (isDuplicate) {
    // 인라인 경고 표시 또는 저장 차단
    return;
  }
  const newFields = [...fields];
  newFields[index] = updated;
  onChange(newFields);
};
```

---

### WR-02: `toFieldId`가 빈 문자열을 반환할 수 있음

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/utils.ts:1`

**Issue:** `label`이 알파벳, 숫자, 한글 이외의 문자(예: `---`, `@@@`, `!!!`)로만 구성된 경우, `replace(/[^a-zA-Z0-9가-힣\s]/g, '')` 이후 빈 문자열이 됩니다. 이후 처리 과정을 거쳐 `id`가 `''`(빈 문자열)로 세팅됩니다. `FieldCard.tsx:35-36`에서 `newLabel.trim()`이 truthy일 때만 id를 덮어쓰므로 label 입력 자체는 막지 않지만, 유효하지 않은 id가 생성될 수 있습니다.

**Fix:** 함수 반환 전에 결과가 비어 있을 경우 폴백 처리를 추가하세요.

```ts
export function toFieldId(label: string): string {
  const result = label
    .trim()
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
    .replace(/\s+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/\s/g, '')
    .replace(/^(.)/, (_, c: string) => c.toLowerCase());
  return result || `field_${Date.now()}`;
}
```

---

### WR-03: `select` 타입의 옵션 key로 배열 인덱스 사용

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx:127`

**Issue:** `options.map((opt, idx) => <div key={idx} ...>)`에서 배열 인덱스를 key로 사용하고 있습니다. 옵션을 삭제할 때 중간 항목이 제거되면, React는 남은 요소의 key가 변경된 것으로 인식하여 input 포커스/커서 위치를 잃거나 상태가 잘못 유지됩니다.

**Fix:** 옵션 추가 시 고유한 `id` 필드를 부여하고 이를 key로 사용하세요.

```ts
// 옵션 타입에 id 추가
type SelectOption = { id: string; value: string; label: string };

// 추가 시
updateConfig({ options: [...options, { id: crypto.randomUUID(), value: '', label: '' }] })

// 렌더링 시
options.map((opt) => <div key={opt.id} ...>)
```

만약 타입 변경이 부담스럽다면 최소한 `${idx}-${opt.value}`처럼 복합 key를 쓰는 것도 임시 방편입니다.

---

### WR-04: `labelEdited` 상태가 필드 전환 시 리셋되지 않음

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx:30`

**Issue:** `labelEdited`는 `useState(false)`로 초기화되는데, `FieldCard`는 `fields` 배열의 인덱스로 재사용될 수 있습니다. 예를 들어 필드 A를 삭제하면 다음 필드 B가 그 인덱스를 차지하고 `expandedIndex`가 조정되어 같은 `FieldCard` 인스턴스가 B를 렌더링합니다. 그러나 `key={field.id}`로 렌더링되므로 React는 B를 새 컴포넌트로 마운트합니다 — 이 경우 `labelEdited`는 정상 리셋됩니다.

실제 문제는 부모에서 동일 `field.id`를 유지한 채 `label`을 외부에서 업데이트하면 `labelEdited`가 `true`로 남아, 자동 id 생성 로직이 영구히 비활성화되는 것입니다. 지금 구조에서는 부모가 label을 외부에서 바꾸는 경로가 없으나, 이 사이드이펙트를 주석이나 타입으로 문서화해두는 것이 좋습니다.

**Fix:** 단기적으로는 `useEffect`로 `field.id`가 변경될 때 `labelEdited`를 리셋하거나, 동작 의도를 주석으로 명시하세요.

```tsx
// field.id가 교체되면 자동 id 생성 로직을 재활성화
useEffect(() => {
  setLabelEdited(false);
}, [field.id]);
```

---

## Info

### IN-01: `table` 타입이 `FIELD_TYPES` 배열에서 누락됨

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts:21`

**Issue:** `SchemaFieldType`에는 `'table'`이 정의되어 있고 `FIELD_TYPE_META`에도 포함되어 있지만, 필드 추가 드롭다운에 사용되는 `FIELD_TYPES` 배열(line 21-29)에는 `'table'`이 없습니다. `FieldConfigEditor`의 switch문에도 `'table'` case가 없어 `default: return null`로 떨어집니다. 의도적인 것(아직 미구현)이라면 주석으로 명시하고, 미구현 타입을 타입 유니온에서 분리하는 것이 명확합니다.

**Fix:** 의도적 제외라면 주석 추가, 구현 예정이라면 `FieldConfigEditor`에 `'table'` case를 추가하세요.

```ts
export const FIELD_TYPES: SchemaFieldType[] = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'staticText',
  'hidden',
  // 'table', // TODO: table 타입은 Phase 1-B에서 구현 예정
];
```

---

### IN-02: `staticText` 케이스의 textarea에 인라인 템플릿 리터럴 스타일 사용

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx:187`

**Issue:** `staticText` 케이스의 textarea에 인라인 백틱 템플릿 리터럴(`className={`w-full ...`}`)이 사용되었는데, 나머지 컴포넌트들은 모두 `SMALL_INPUT_CLASS`, `INPUT_CLASS` 상수를 재사용하는 패턴을 따릅니다. 일관성이 깨져 있습니다.

**Fix:** `constants.ts`에 `TEXTAREA_CLASS`를 추출하여 사용하세요.

```ts
// constants.ts
export const TEXTAREA_CLASS =
  'w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors resize-none border-gray-300 dark:border-gray-600';
```

---

### IN-03: 이동 버튼의 `title` 텍스트가 하드코딩된 한국어 문자열

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx:76`
**File:** `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx:84`

**Issue:** `title="위로 이동"`, `title="아래로 이동"` 문자열이 `t()` 없이 직접 하드코딩되어 있습니다. 같은 파일의 나머지 모든 UI 텍스트는 `useTranslation`을 사용합니다.

**Fix:** i18n 키를 추가하거나 임시로 `t()`로 감싸세요.

```tsx
title={t('templates.moveUp')}
title={t('templates.moveDown')}
```

---

_Reviewed: 2026-04-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
