# Phase 24: 조건부 표시 규칙 UI - Research

**Researched:** 2026-04-12
**Domain:** React 조건부 규칙 편집 UI (프론트엔드 전용)
**Confidence:** HIGH

## Summary

Phase 24는 순수 프론트엔드 작업으로, 관리자가 양식 필드 간 조건부 표시/숨김 규칙을 설정하는 UI를 구현한다. 핵심 조건 평가 로직(`evaluateConditions.ts`)은 이미 Phase 22에서 구현 완료되어 있으며, 이번 Phase에서는 규칙 편집 UI, 미리보기 인터랙티브화, 필드 삭제 시 규칙 자동 정리만 구현하면 된다.

기존 코드베이스가 잘 구조화되어 있어 새 라이브러리 도입 없이 기존 패턴(접기/펼치기 섹션, SMALL_INPUT_CLASS, lucide-react 아이콘, i18n admin 네임스페이스)을 재사용하여 구현할 수 있다. FieldConfigEditor 아래에 조건 규칙 섹션을 추가하고, FormPreview를 인터랙티브하게 전환하며, SchemaFieldEditor의 deleteField에 규칙 정리 로직을 추가하는 것이 주요 작업이다.

**Primary recommendation:** 새 컴포넌트 `ConditionalRuleEditor`를 SchemaFieldEditor 디렉토리에 추가하고, 기존 패턴(TableColumnEditor의 접기/펼치기, SMALL_INPUT_CLASS, 즉시 삭제)을 그대로 따라 일관성을 유지한다. conditionalRules 상태는 TemplateFormModal에서 관리하고 SchemaFieldEditor를 통해 전달한다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** FieldConfigEditor 내부에 접기/펼치기 섹션으로 배치 -- 기본 설정 아래에 '조건 규칙' 섹션을 접기/펼치기로 추가
- **D-02:** 필드당 조건 규칙 1개만 허용
- **D-03:** 빈 상태는 '조건 규칙이 없습니다' 안내 문구 + '조건 추가' 버튼 표시
- **D-04:** 조건 타겟 제외 타입 -- staticText, hidden은 조건 대상에서 제외
- **D-05:** 조건 소스 허용 타입 -- text, number, date, select만 허용
- **D-06:** 규칙이 설정된 필드카드 헤더에 아이콘 배지 표시
- **D-07:** 드롭다운 조합 방식 -- IF [필드] [연산자] [값] THEN [액션]
- **D-08:** 연산자는 소스 필드 타입별 필터링
- **D-09:** 연산자와 액션은 한국어 레이블 (i18n 키로 관리)
- **D-10:** select 소스 필드일 때 값 입력은 해당 필드의 옵션 드롭다운
- **D-11:** in/notIn 연산자 선택 시 복수 값은 체크박스 목록으로 입력
- **D-12:** 자기참조 차단 -- IF 필드 드롭다운에서 현재 필드 제외
- **D-13:** 순환 참조 차단 -- A->B 조건이 있을 때 B->A에서 A 제외
- **D-14:** 규칙 삭제는 즉시 삭제 (확인 다이얼로그 없음)
- **D-15:** 데이터 관리는 SchemaDefinition.conditionalRules[] 중앙 배열 유지
- **D-16:** 모든 필드 입력 가능한 인터랙티브 미리보기
- **D-17:** 조건 충족/미충족 시 즉시 전환 (애니메이션 없음)
- **D-18:** require 액션 시 필드 레이블 옆에 빨간 * 표시
- **D-19:** 미리보기 초기 로드 시 모든 필드 표시
- **D-20:** 미리보기 상단에 '초기화' 버튼
- **D-21:** 필드 삭제 시 관련 조건 규칙 자동 삭제 + 토스트
- **D-22:** 양방향 정리 -- 삭제된 필드가 타겟이든 소스든 규칙 모두 제거
- **D-23:** 토스트 메시지는 '조건 규칙 N개가 자동 제거되었습니다'
- **D-24:** 필드 라벨 변경은 규칙에 영향 없음 (ID 기반 참조)
- **D-25:** 소스 필드 타입 변경 시 해당 규칙 자동 제거 + 토스트
- **D-26:** 프론트엔드에서만 검증 -- 저장 시 유효성 체크
- **D-27:** 유효성 검증 실패 시 에러 토스트 + 저장 차단
- **D-28:** i18n 키는 templates.condition.* 네이밍 패턴
- **D-29:** dynamicForm.ts의 ConditionalRule 타입 재사용

### Claude's Discretion
- 접기/펼치기 섹션의 정확한 Tailwind 스타일링
- 드롭다운 컴포넌트의 구체적인 구현 방식
- 아이콘 배지의 정확한 아이콘 선택
- 안내 문구의 정확한 한국어 텍스트
- 미리보기 초기화 버튼의 위치와 스타일

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CND-01 | 관리자가 필드별 조건부 표시/숨김 규칙을 설정할 수 있다 (IF 필드 = 값 THEN 표시/숨김/필수/선택) | ConditionalRuleEditor 컴포넌트 + FieldCard 배지 + 연산자 타입별 필터링 + i18n 키 |
| CND-02 | 필드 삭제 시 해당 필드를 참조하는 규칙이 자동 정리된다 | SchemaFieldEditor의 deleteField/updateField에 규칙 정리 로직 + 토스트 알림 |
</phase_requirements>

## Standard Stack

이 Phase는 새 라이브러리 도입이 불필요하다. 기존 프로젝트 스택을 100% 재사용한다.

### Core (이미 설치됨)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| React 18 | UI 프레임워크 | 프로젝트 기본 스택 [VERIFIED: package.json] |
| TypeScript | 타입 안전성 | 프로젝트 기본 스택 [VERIFIED: package.json] |
| TailwindCSS | 스타일링 | 기존 SMALL_INPUT_CLASS 등 상수 재사용 [VERIFIED: constants.ts] |
| lucide-react | 아이콘 | 기존 컴포넌트에서 사용 중 [VERIFIED: FieldCard.tsx] |
| react-i18next | 국제화 | admin 네임스페이스 사용 중 [VERIFIED: admin.json] |
| sonner | 토스트 알림 | TemplateFormModal에서 toast() 사용 중 [VERIFIED: TemplateFormModal.tsx] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native select/dropdown | Headless UI Listbox | 오버엔지니어링 -- 이 규모에서 native select 충분 |
| Custom rule builder | JSON Schema Form | 규칙이 필드당 1개로 단순하므로 커스텀이 더 가벼움 |

## Architecture Patterns

### 파일 구조 변경
```
frontend/src/features/admin/components/
├── SchemaFieldEditor/
│   ├── ConditionalRuleEditor.tsx   # NEW: 조건 규칙 편집 섹션
│   ├── conditionalRuleUtils.ts     # NEW: 순환참조 감지, 규칙 정리 유틸
│   ├── FieldCard.tsx               # MODIFY: 조건 배지 추가
│   ├── FieldConfigEditor.tsx       # MODIFY: 조건 섹션 삽입 위치 (하단)
│   ├── SchemaFieldEditor.tsx       # MODIFY: conditionalRules prop 추가 + 정리 로직
│   ├── types.ts                    # MODIFY: OperatorOption, ActionOption 등 UI 타입 추가
│   ├── constants.ts                # MODIFY: CONDITION_SOURCE_TYPES, OPERATOR_MAP 상수 추가
│   └── ... (기존 파일 유지)
├── FormPreview/
│   ├── FormPreview.tsx             # MODIFY: 인터랙티브 미리보기 전환
│   ├── PreviewFieldRenderer.tsx    # MODIFY: disabled -> enabled 입력 + onChange
│   └── FullscreenPreviewPortal.tsx # MODIFY: 인터랙티브 미리보기 전달
└── TemplateFormModal.tsx           # MODIFY: conditionalRules 상태 관리 + 전달
```

### Pattern 1: 조건 규칙 데이터 흐름
**What:** TemplateFormModal이 conditionalRules[] 중앙 상태를 관리하고, SchemaFieldEditor를 통해 하위로 전달
**When to use:** 이 Phase의 모든 조건 규칙 조작에 적용

```
TemplateFormModal
  ├─ state: conditionalRules: ConditionalRule[]
  ├─ SchemaFieldEditor
  │   ├─ props: conditionalRules, onConditionalRulesChange
  │   ├─ FieldCard (배지: conditionalRules.some(r => r.targetFieldId === field.id))
  │   │   └─ FieldConfigEditor
  │   │       └─ ConditionalRuleEditor (targetFieldId로 필터링해서 0~1개 규칙 표시)
  │   └─ deleteField 시: cleanupRulesForDeletedField(fieldId, rules) -> toast
  └─ FormPreview
      ├─ state: formValues: Record<string, unknown>
      ├─ evaluateConditions(conditionalRules, formValues) -> hiddenFields, requiredFields
      └─ PreviewFieldRenderer (hiddenFields에 포함되면 렌더링 안 함, requiredFields에 포함되면 * 표시)
```

### Pattern 2: 연산자 타입별 필터링
**What:** 소스 필드 타입에 따라 사용 가능한 연산자를 필터링
**When to use:** ConditionalRuleEditor에서 연산자 드롭다운 렌더링 시

```typescript
// Source: CONTEXT.md D-08
const OPERATORS_BY_TYPE: Record<string, ComparisonOperator[]> = {
  text:   ['eq', 'neq', 'isEmpty', 'isNotEmpty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  date:   ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'],
  select: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
};
```

### Pattern 3: 순환 참조 감지
**What:** A->B 조건이 있을 때 B->A 조건에서 A를 소스 필드 후보에서 제거
**When to use:** IF 필드 드롭다운의 옵션 목록 생성 시

```typescript
// Source: CONTEXT.md D-13
function getAvailableSourceFields(
  targetFieldId: string,
  allFields: SchemaField[],
  rules: ConditionalRule[],
): SchemaField[] {
  // 1. 자기 자신 제외 (D-12)
  // 2. 허용 타입만 (D-05: text, number, date, select)
  // 3. targetFieldId를 소스로 사용하는 규칙이 있는 필드 제외 (D-13: 순환 방지)
  const fieldsTargetingMe = rules
    .filter(r => r.condition.fieldId === targetFieldId)
    .map(r => r.targetFieldId);

  return allFields.filter(f =>
    f.id !== targetFieldId &&
    ['text', 'number', 'date', 'select'].includes(f.type) &&
    !fieldsTargetingMe.includes(f.id)
  );
}
```

### Pattern 4: 미리보기 인터랙티브화
**What:** FormPreview와 PreviewFieldRenderer를 disabled에서 enabled 입력으로 전환
**When to use:** FormPreview 수정 시

```typescript
// FormPreview가 formValues state를 관리하고 evaluateConditions를 호출
const [formValues, setFormValues] = useState<Record<string, unknown>>({});
const { hiddenFields, requiredFields } = evaluateConditions(conditionalRules, formValues);

// 각 필드에 대해:
// - hiddenFields에 포함 -> 렌더링 안 함
// - requiredFields에 포함 -> label 옆에 * 표시
// - onChange로 formValues 업데이트 -> 조건 재평가
```

### Anti-Patterns to Avoid
- **각 FieldCard에서 자체 규칙 상태 관리:** 중앙 배열(D-15)로 관리해야 함. 분산 시 정합성 깨짐
- **evaluateConditions 로직 재구현:** 이미 완성된 함수가 있으므로 import해서 사용
- **순환 참조를 런타임에서 감지:** 설정 시점에서 드롭다운 필터링으로 원천 차단(D-13)
- **필드 삭제 시 규칙 정리를 별도 useEffect로:** deleteField 콜백 내에서 동기적으로 처리

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 조건 평가 로직 | 새로운 조건 평가 함수 | `evaluateConditions()` from `evaluateConditions.ts` | 이미 10개 연산자 전부 구현 완료 [VERIFIED: evaluateConditions.ts] |
| 토스트 알림 | 커스텀 알림 컴포넌트 | `toast()` from sonner | 이미 프로젝트 전체에서 사용 [VERIFIED: TemplateFormModal.tsx] |
| 타입 정의 | 새로운 ConditionalRule 타입 | `ConditionalRule` from `dynamicForm.ts` | 이미 정의되어 있음 (D-29) [VERIFIED: dynamicForm.ts] |

**Key insight:** 이 Phase의 핵심 난이도는 비즈니스 로직이 아니라 UI 인터랙션 설계에 있다. 조건 평가와 타입은 이미 구현되어 있으므로, 편집 UI의 UX 품질에 집중해야 한다.

## Common Pitfalls

### Pitfall 1: conditionalRules 상태 전달 누락
**What goes wrong:** SchemaFieldEditor에 conditionalRules를 전달하지 않으면 규칙 편집/정리가 불가
**Why it happens:** 현재 SchemaFieldEditor의 props에 conditionalRules가 없음
**How to avoid:** SchemaFieldEditorProps 타입에 `conditionalRules: ConditionalRule[]`와 `onConditionalRulesChange: (rules: ConditionalRule[]) => void` 추가. TemplateFormModal에서 전달
**Warning signs:** 조건 섹션이 빈 상태로만 표시됨

### Pitfall 2: 기존 schemaDefinition.conditionalRules: [] 하드코딩
**What goes wrong:** TemplateFormModal.tsx line 137에서 `conditionalRules: []`로 하드코딩되어 있어, 편집 모드에서 기존 규칙이 날아감
**Why it happens:** Phase 22에서 미래 확장용으로 빈 배열 placeholder를 넣어둔 것
**How to avoid:** conditionalRules state를 사용하도록 변경: `conditionalRules: conditionalRules` [VERIFIED: TemplateFormModal.tsx:137]
**Warning signs:** 양식 저장 후 다시 열면 조건 규칙이 사라짐

### Pitfall 3: 편집 모드에서 기존 규칙 로드 누락
**What goes wrong:** 기존 양식 편집 시 schemaDefinition에서 conditionalRules를 파싱하지 않으면 규칙이 표시되지 않음
**Why it happens:** 현재 detailQuery.data에서 schema.fields만 추출 (line 91)
**How to avoid:** `setConditionalRules(schema.conditionalRules || [])` 추가 [VERIFIED: TemplateFormModal.tsx:89-92]
**Warning signs:** 편집 모드에서 조건 규칙 섹션이 항상 비어 있음

### Pitfall 4: FormPreview에 conditionalRules 미전달
**What goes wrong:** 미리보기에서 조건이 동작하지 않음
**Why it happens:** 현재 FormPreview props에 conditionalRules가 없음
**How to avoid:** FormPreview에 conditionalRules prop 추가, 내부에서 formValues state 관리 + evaluateConditions 호출
**Warning signs:** 미리보기에서 소스 필드 값을 변경해도 타겟 필드 표시 상태가 변하지 않음

### Pitfall 5: 필드 타입 변경 시 규칙 정리 누락
**What goes wrong:** text -> staticText로 변경했는데 해당 필드를 소스로 참조하는 규칙이 남아 있음
**Why it happens:** D-25에 따르면 소스 필드 타입 변경 시에도 규칙을 제거해야 하는데, updateField에서 타입 변경 감지 로직을 빠뜨림
**How to avoid:** SchemaFieldEditor의 updateField에서 type 변경 감지 시 해당 필드를 소스로 참조하는 규칙 제거
**Warning signs:** 타입 변경 후 저장 시 유효성 검증에서 에러 발생

## Code Examples

### ConditionalRuleEditor 컴포넌트 골격

```typescript
// Source: CONTEXT.md D-01 ~ D-14, 기존 코드 패턴 분석
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type { ConditionalRule } from '../../../document/types/dynamicForm';
import type { SchemaField } from './types';
import { SMALL_INPUT_CLASS } from './constants';

interface ConditionalRuleEditorProps {
  targetFieldId: string;
  rule: ConditionalRule | undefined; // D-02: 필드당 1개
  allFields: SchemaField[];
  allRules: ConditionalRule[];
  onAddRule: (rule: ConditionalRule) => void;
  onUpdateRule: (rule: ConditionalRule) => void;
  onDeleteRule: () => void;
}

export function ConditionalRuleEditor({
  targetFieldId,
  rule,
  allFields,
  allRules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}: ConditionalRuleEditorProps) {
  const { t } = useTranslation('admin');

  if (!rule) {
    // D-03: 빈 상태
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500">
        <p>{t('templates.condition.noRule')}</p>
        <button type="button" onClick={handleAdd} className="...">
          <Plus className="w-3.5 h-3.5" />
          {t('templates.condition.addRule')}
        </button>
      </div>
    );
  }

  // IF [필드] [연산자] [값] THEN [액션] 드롭다운 조합 (D-07)
  return (
    <div className="space-y-2">
      {/* 소스 필드 선택 */}
      {/* 연산자 선택 (타입별 필터) */}
      {/* 값 입력 (select이면 옵션 드롭다운) */}
      {/* 액션 선택 */}
      {/* 삭제 버튼 */}
    </div>
  );
}
```

### 규칙 정리 유틸리티 함수

```typescript
// Source: CONTEXT.md D-21 ~ D-25
import type { ConditionalRule } from '../../../document/types/dynamicForm';

/**
 * 필드 삭제 시 관련 규칙 정리
 * @returns [정리된 규칙 배열, 제거된 규칙 수]
 */
export function cleanupRulesForDeletedField(
  deletedFieldId: string,
  rules: ConditionalRule[],
): [ConditionalRule[], number] {
  const before = rules.length;
  const cleaned = rules.filter(
    r => r.targetFieldId !== deletedFieldId && r.condition.fieldId !== deletedFieldId
  );
  return [cleaned, before - cleaned.length];
}

/**
 * 소스 필드 타입 변경 시 관련 규칙 정리
 */
export function cleanupRulesForTypeChange(
  changedFieldId: string,
  newType: string,
  rules: ConditionalRule[],
): [ConditionalRule[], number] {
  const SOURCE_TYPES = ['text', 'number', 'date', 'select'];
  if (SOURCE_TYPES.includes(newType)) return [rules, 0];

  // 새 타입이 소스 불가 타입이면 해당 필드를 소스로 참조하는 규칙 제거
  const before = rules.length;
  const cleaned = rules.filter(r => r.condition.fieldId !== changedFieldId);
  return [cleaned, before - cleaned.length];
}

/**
 * 순환 참조 감지용 -- 특정 타겟 필드의 사용 가능 소스 필드 목록
 */
export function getAvailableSourceFields(
  targetFieldId: string,
  allFields: SchemaField[],
  rules: ConditionalRule[],
): SchemaField[] {
  const fieldsTargetingMe = rules
    .filter(r => r.condition.fieldId === targetFieldId)
    .map(r => r.targetFieldId);

  return allFields.filter(f =>
    f.id !== targetFieldId &&
    ['text', 'number', 'date', 'select'].includes(f.type) &&
    !fieldsTargetingMe.includes(f.id)
  );
}
```

### i18n 키 구조 (templates.condition.*)

```json
{
  "templates": {
    "condition": {
      "sectionTitle": "조건 규칙",
      "noRule": "조건 규칙이 없습니다",
      "addRule": "조건 추가",
      "deleteRule": "조건 삭제",
      "if": "IF",
      "then": "THEN",
      "selectField": "필드 선택",
      "selectOperator": "연산자 선택",
      "selectAction": "액션 선택",
      "enterValue": "값 입력",
      "operators": {
        "eq": "값이 같음",
        "neq": "값이 다름",
        "gt": "보다 큼",
        "gte": "이상",
        "lt": "보다 작음",
        "lte": "이하",
        "in": "포함",
        "notIn": "미포함",
        "isEmpty": "비어있음",
        "isNotEmpty": "비어있지 않음"
      },
      "actions": {
        "show": "표시",
        "hide": "숨김",
        "require": "필수로 변경",
        "unrequire": "선택으로 변경"
      },
      "rulesAutoRemoved": "조건 규칙 {{count}}개가 자동 제거되었습니다",
      "validationError": "조건 규칙에 오류가 있습니다",
      "noSourceFields": "조건 소스로 사용 가능한 필드가 없습니다",
      "resetPreview": "초기화"
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 정적 미리보기 (disabled inputs) | 인터랙티브 미리보기 (enabled inputs + 조건 평가) | Phase 24 | 미리보기에서 조건 동작 실시간 확인 가능 |
| conditionalRules: [] 하드코딩 | conditionalRules state 관리 | Phase 24 | 실제 규칙 저장/로드 가능 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | FullscreenPreviewPortal도 인터랙티브 미리보기로 전환 필요 | Architecture Patterns | 전체화면 미리보기에서 조건 동작 안 됨 -- 영향 낮음, 추후 수정 가능 |

## Open Questions

1. **select 필드의 in/notIn 연산자 UI**
   - What we know: D-11에 따르면 체크박스 목록으로 구현
   - What's unclear: 옵션이 많을 때(10개+) 스크롤 처리 방식
   - Recommendation: 최대 높이 제한(max-h-40 overflow-y-auto)으로 처리

2. **FieldCard vs FieldConfigEditor에 조건 섹션 배치 위치**
   - What we know: D-01은 FieldConfigEditor 내부라고 명시
   - What's unclear: FieldConfigEditor가 switch문으로 타입별 설정만 반환하므로, 조건 섹션은 FieldCard에서 FieldConfigEditor 아래에 별도 섹션으로 배치하는 것이 자연스러움
   - Recommendation: FieldCard의 expanded 영역에서 FieldConfigEditor 아래에 ConditionalRuleEditor를 렌더링. 이것이 "FieldConfigEditor 내부" 의도와 실질적으로 동일하면서 코드 구조가 더 깔끔

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 없음 -- 프로젝트에 테스트 프레임워크 미설치 |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CND-01 | 조건 규칙 설정 UI (드롭다운 조합, 연산자 필터, 순환참조 차단) | manual-only | N/A -- 테스트 프레임워크 없음 | N/A |
| CND-02 | 필드 삭제 시 규칙 자동 정리 | manual-only | N/A | N/A |

### Wave 0 Gaps
- 테스트 프레임워크 미설치로 자동화 테스트 불가. 순수 유틸리티 함수(`cleanupRulesForDeletedField`, `getAvailableSourceFields`)는 단위 테스트 가능하나 프레임워크 도입은 이 Phase 범위 밖.

### Sampling Rate
- **Per task commit:** `npm run build` (타입 에러 감지)
- **Per wave merge:** 수동 테스트 -- 양식 편집 모달에서 조건 규칙 추가/삭제/미리보기 확인
- **Phase gate:** 빌드 성공 + 3개 Success Criteria 수동 검증

## Sources

### Primary (HIGH confidence)
- `evaluateConditions.ts` -- 조건 평가 로직 10개 연산자 구현 확인
- `dynamicForm.ts` -- ConditionalRule, SchemaDefinition 타입 확인
- `FieldConfigEditor.tsx` -- switch문 패턴, SMALL_INPUT_CLASS 사용 확인
- `FieldCard.tsx` -- 헤더 구조, 배지 추가 가능 위치 확인
- `SchemaFieldEditor.tsx` -- fields prop 패턴, deleteField 로직 확인
- `FormPreview.tsx` -- 현재 정적 렌더링 구조 확인
- `PreviewFieldRenderer.tsx` -- disabled 입력 필드 구조 확인
- `TemplateFormModal.tsx` -- conditionalRules: [] 하드코딩 위치 확인 (line 137)
- `TableColumnEditor.tsx` -- 접기/펼치기, 즉시 삭제 패턴 참고
- `admin.json` (ko) -- 기존 i18n 키 구조 확인, templates.condition.* 네이밍 적합 확인

### Secondary (MEDIUM confidence)
- CONTEXT.md D-01~D-29 -- 사용자 결정 사항 (모든 주요 설계가 확정됨)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 새 라이브러리 없이 기존 스택 100% 재사용
- Architecture: HIGH -- 기존 코드 패턴을 직접 분석하여 확인, CONTEXT.md에 상세한 결정 사항 존재
- Pitfalls: HIGH -- 실제 코드를 읽고 수정 필요 지점 5곳 모두 확인

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (프론트엔드 전용, 외부 의존성 없으므로 안정적)
