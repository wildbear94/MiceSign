# Phase 15: Advanced Logic - Research

**Researched:** 2026-04-06
**Domain:** 조건부 폼 로직, 계산 필드, 순환 의존성 감지, 시각적 섹션
**Confidence:** HIGH

## Summary

Phase 15는 기존 동적 폼 빌더(Phase 14)에 스마트 폼 기능을 추가한다. 핵심은 4가지: (1) 조건부 표시/숨기기/필수 규칙, (2) 순환 의존성 감지, (3) 계산 필드, (4) 시각적 섹션 그룹화. 이 모든 기능은 기존 `SchemaDefinition` 타입의 `conditionalRules: unknown[]`과 `calculationRules: unknown[]` placeholder를 구체화하고, react-hook-form의 `useWatch`를 활용하여 구현한다.

핵심 기술적 결정은 CONTEXT.md에서 이미 확정되었다: 조건부 규칙은 타겟 필드 기준 구조, `useWatch`로 소스 필드 값 감시, `schemaToZod` 동적 재생성으로 조건부 required 처리, 계산은 프론트엔드 전용 (백엔드 저장만), 순환 감지는 DFS 기반으로 프론트/백 양쪽 구현. 새 라이브러리는 `expr-eval` 하나만 추가하면 된다 (계산 필드용, STATE.md에서 이미 결정).

**Primary recommendation:** react-hook-form `useWatch` + 순수 함수 기반 조건 평가 엔진으로 구현. 계산 필드는 단순 연산(SUM/MULTIPLY/ADD/COUNT)만 지원하므로 expr-eval 없이 직접 구현이 더 간단하지만, 향후 확장성(복합 수식)을 위해 expr-eval 사용을 권장.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: 연산자는 기본 세트: `equals`, `not_equals`, `is_empty`, `is_not_empty`
- D-02: 하나의 타겟 필드에 여러 조건 조합 시 `matchType: 'all' | 'any'` 선택식 (AND + OR)
- D-03: Builder UI에서 기존 PropertyPanel에 'Conditions' 탭 추가
- D-04: 런타임에 조건 미충족 시 DOM에서 필드 완전 제거 + 값 초기화, 제출 시 숨겨진 필드 데이터 미포함
- D-05: conditionalRules는 타겟 필드 기준 구조 (구체적 JSON 스키마 확정됨)
- D-06: 조건부 `require` 시 schemaToZod를 동적으로 재생성
- D-07: 기존 `required`와 조건부 require는 OR 관계
- D-08: 기존 number 필드 확장, calculationType 설정 시 readonly 전환
- D-09: 테이블 칸럼 합계는 테이블 외부에 계산 필드 배치, `table.columnId` 형식으로 참조
- D-10: 계산은 프론트엔드에서만 실행, 백엔드는 제출된 값 그대로 저장
- D-11: calculationRules는 타겟 필드 기준 구조 (구체적 JSON 스키마 확정됨)
- D-12: 계산 설정은 기존 PropertyAdvancedTab에 통합, number 필드만 표시
- D-13: sourceFields 선택은 드롭다운 — number 필드와 table.column 그룹화, 다중 선택
- D-14: 템플릿 저장 시 전체 규칙 그래프 순환 검사 → 저장 차단
- D-15: 에러는 빨간 토스트로 순환 경로 표시
- D-16: 백엔드에서도 순환 의존성 검증 수행 (같은 알고리즘 Java 구현)
- D-17: 새로운 `section` FieldType 추가, 섹션 헤더 ~ 다음 섹션 헤더까지 그룹화
- D-18: 사용자 작성 시 섹션 헤더 클릭으로 접기/펼치기
- D-19: section도 conditionalRules 대상 가능, 섹션 숨기면 하위 필드 모두 숨김 + 값 초기화

### Claude's Discretion
- 순환 감지 알고리즘 선택 (DFS 기반 등)
- 조건부 규칙 평가 엔진의 내부 구현 패턴
- 계산 필드의 소수점 처리 방식
- Conditions 탭의 세부 UI 레이아웃
- 섹션 접기/펼치기 애니메이션 스타일

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOGIC-01 | Admin이 다른 필드 값에 기반하여 필드를 표시/숨기기/필수로 설정하는 조건부 규칙 구성 | useWatch 기반 조건 평가 엔진, PropertyConditionsTab, schemaToZod 동적 재생성 |
| LOGIC-02 | 시스템이 순환 의존성을 감지하고 저장 차단 + 에러 메시지 표시 | DFS 기반 그래프 순환 감지 알고리즘 (프론트+백엔드), 토스트 UI |
| LOGIC-03 | Admin이 SUM/MULTIPLY/ADD/COUNT 연산의 계산 필드 정의 | FieldConfig 확장, 계산 실행 엔진, PropertyAdvancedTab 통합 |
| LOGIC-04 | Admin이 접기/펼치기 가능한 시각적 섹션으로 필드 그룹화 | section FieldType 추가, DynamicSectionField 컴포넌트, 조건부 섹션 숨김 |
</phase_requirements>

## Standard Stack

### Core (이미 설치됨)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | 7.72.0 | 폼 상태 관리 + `useWatch` | 이미 사용 중, 조건부 로직의 핵심 [VERIFIED: node_modules] |
| zod | 4.3.6 | 런타임 검증 스키마 | 이미 사용 중, 동적 required 전환 필요 [VERIFIED: node_modules] |
| @hookform/resolvers | 설치됨 | Zod-RHF 통합 | 이미 사용 중 [VERIFIED: package.json] |
| @headlessui/react | 설치됨 | 탭 컴포넌트 등 UI 프리미티브 | PropertyPanel 탭에 이미 사용 [VERIFIED: node_modules] |
| lucide-react | 설치됨 | 아이콘 | section 아이콘 추가 필요 [VERIFIED: package.json] |

### 신규 추가 불필요
| Library | Reason for NOT adding |
|---------|----------------------|
| expr-eval | STATE.md에서 권장했으나, D-11에서 연산이 SUM/MULTIPLY/ADD/COUNT 4개로 확정. 이 단순 연산은 직접 구현이 더 적합 (외부 의존성 없이 10줄 이내). 향후 사용자 정의 수식 지원 시에만 도입 권장 |

**Installation:**
```bash
# 신규 npm 패키지 설치 불필요 — 모든 의존성이 이미 존재
```

[VERIFIED: package.json 및 node_modules 직접 확인]

## Architecture Patterns

### 신규/수정 파일 구조
```
frontend/src/
├── features/document/
│   ├── types/dynamicForm.ts                    # 수정: ConditionalRule, CalculationRule, section 타입 추가
│   ├── utils/
│   │   ├── schemaToZod.ts                      # 수정: 조건부 required 반영 동적 재생성
│   │   ├── evaluateConditions.ts               # 신규: 조건부 규칙 평가 순수 함수
│   │   ├── executeCalculations.ts              # 신규: 계산 필드 실행 순수 함수
│   │   └── detectCircularDeps.ts               # 신규: 순환 의존성 감지 (프론트엔드)
│   └── components/templates/dynamic/
│       ├── DynamicForm.tsx                      # 수정: useWatch + 조건/계산 엔진 통합
│       ├── DynamicFieldRenderer.tsx             # 수정: section case 추가
│       └── DynamicSectionField.tsx              # 신규: 섹션 헤더 + 접기/펼치기
├── features/admin/
│   ├── types/builder.ts                         # 수정: section 타입, conditionalRules/calculationRules 타입
│   ├── components/builder/
│   │   ├── PropertyPanel.tsx                    # 수정: Conditions 탭 추가
│   │   ├── PropertyConditionsTab.tsx            # 신규: 조건부 규칙 편집 UI
│   │   ├── PropertyAdvancedTab.tsx              # 수정: 계산 필드 설정 통합
│   │   ├── FieldPalette.tsx                     # 수정: section 아이콘 매핑 추가
│   │   └── useBuilderReducer.ts                # 수정: 규칙 관련 액션 추가
│   └── pages/TemplateBuilderPage.tsx            # 수정: 저장 시 순환 검증 + 규칙 데이터 포함
backend/src/main/java/com/micesign/
    └── service/
        ├── AdminTemplateService.java            # 수정: 저장 시 순환 검증 호출
        └── CircularDependencyValidator.java     # 신규: DFS 기반 순환 검증
```

### Pattern 1: useWatch 기반 조건부 규칙 평가
**What:** react-hook-form의 `useWatch`로 소스 필드 값을 구독하고, 조건 평가 결과에 따라 필드 표시/숨김/필수 상태를 결정
**When to use:** DynamicForm 컴포넌트에서 렌더링 시
**Example:**
```typescript
// DynamicForm.tsx 내부
import { useWatch } from 'react-hook-form';

// 모든 조건부 규칙의 소스 필드 ID를 추출
const sourceFieldIds = useMemo(() => {
  const ids = new Set<string>();
  for (const rule of schema.conditionalRules) {
    for (const cond of rule.conditions) {
      ids.add(cond.sourceFieldId);
    }
  }
  return Array.from(ids);
}, [schema.conditionalRules]);

// useWatch로 소스 필드 값 구독 (변경 시 자동 리렌더)
const watchedValues = useWatch({ control, name: sourceFieldIds });

// 조건 평가 — 어떤 필드가 visible/hidden/required인지 계산
const fieldVisibility = useMemo(() => {
  return evaluateConditions(schema.conditionalRules, sourceFieldIds, watchedValues, schema.fields);
}, [schema.conditionalRules, sourceFieldIds, watchedValues, schema.fields]);
```
[VERIFIED: react-hook-form 7.x에서 useWatch는 name 배열 지원 확인 — node_modules 타입 확인]

### Pattern 2: schemaToZod 동적 재생성 (조건부 required)
**What:** 조건 평가 결과에 따라 Zod 스키마를 매번 재생성하여 동적으로 required/optional 전환
**When to use:** fieldVisibility 상태가 변경될 때마다
**Example:**
```typescript
// DynamicForm.tsx 내부
const zodSchema = useMemo(() => {
  if (!schema?.fields?.length) return null;
  // fieldVisibility 맵을 전달하여 조건부 required 반영
  return schemaToZod(schema.fields, fieldVisibility);
}, [schema, fieldVisibility]);
```

**주의사항:** zodResolver를 매번 재생성하면 react-hook-form이 재검증한다. 이는 의도된 동작이지만, resolver가 변경될 때 `trigger()`를 호출하여 기존 에러 상태를 동기화해야 한다. [ASSUMED]

### Pattern 3: DFS 기반 순환 의존성 감지
**What:** conditionalRules와 calculationRules의 소스→타겟 관계를 방향 그래프로 변환하고, DFS로 순환 검출
**When to use:** 템플릿 저장 시 (프론트엔드 + 백엔드)
**Example:**
```typescript
// detectCircularDeps.ts — 순수 함수, 프레임워크 무관
interface Edge { from: string; to: string; }

export function detectCircularDeps(
  conditionalRules: ConditionalRule[],
  calculationRules: CalculationRule[]
): string[] | null {
  // 1. 그래프 구축: source → target 방향
  const graph = new Map<string, Set<string>>();

  for (const rule of conditionalRules) {
    for (const cond of rule.conditions) {
      if (!graph.has(cond.sourceFieldId)) graph.set(cond.sourceFieldId, new Set());
      graph.get(cond.sourceFieldId)!.add(rule.targetFieldId);
    }
  }
  for (const rule of calculationRules) {
    for (const src of rule.sourceFields) {
      if (!graph.has(src)) graph.set(src, new Set());
      graph.get(src)!.add(rule.targetFieldId);
    }
  }

  // 2. DFS로 순환 검출
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  let cyclePath: string[] | null = null;

  function dfs(node: string): boolean {
    color.set(node, GRAY);
    for (const neighbor of graph.get(node) ?? []) {
      if (color.get(neighbor) === GRAY) {
        // 순환 발견 — 경로 역추적
        cyclePath = [neighbor, node];
        let curr = node;
        while (parent.get(curr) && parent.get(curr) !== neighbor) {
          curr = parent.get(curr)!;
          cyclePath.push(curr);
        }
        cyclePath.reverse();
        return true;
      }
      if (color.get(neighbor) === WHITE) {
        parent.set(neighbor, node);
        if (dfs(neighbor)) return true;
      }
    }
    color.set(node, BLACK);
    return false;
  }

  for (const node of graph.keys()) {
    if (!color.has(node) || color.get(node) === WHITE) {
      if (dfs(node)) return cyclePath;
    }
  }
  return null; // 순환 없음
}
```
[ASSUMED — DFS 기반 순환 감지는 표준 그래프 알고리즘, 구현 세부사항은 변형 가능]

### Pattern 4: 계산 필드 실행
**What:** SUM/MULTIPLY/ADD/COUNT 연산을 소스 필드 값으로 계산하여 타겟 필드에 설정
**When to use:** useWatch로 소스 필드 값 변경 감지 시
**Example:**
```typescript
// executeCalculations.ts
export function executeCalculation(
  rule: CalculationRule,
  formValues: Record<string, unknown>,
): number {
  const values = rule.sourceFields.map(fieldId => {
    if (fieldId.includes('.')) {
      // table.columnId 형식 — 테이블 배열의 해당 컬럼 값 추출
      const [tableId, colId] = fieldId.split('.');
      const rows = formValues[tableId] as Record<string, unknown>[] ?? [];
      return rows.map(row => Number(row[colId]) || 0);
    }
    return [Number(formValues[fieldId]) || 0];
  }).flat();

  switch (rule.operation) {
    case 'SUM':
    case 'ADD':
      return values.reduce((a, b) => a + b, 0);
    case 'MULTIPLY':
      return values.reduce((a, b) => a * b, 1);
    case 'COUNT':
      return values.length;
    default:
      return 0;
  }
}
```
[ASSUMED — 소수점 처리는 toFixed(2) 또는 Math.round 기반 권장]

### Pattern 5: 섹션 필드 타입
**What:** `section` FieldType이 다음 section까지의 필드를 그룹화, 접기/펼치기 지원
**When to use:** DynamicForm 렌더링 시 필드 목록을 섹션별로 그룹화
**Example:**
```typescript
// DynamicSectionField.tsx
interface DynamicSectionFieldProps {
  fieldDef: FieldDefinition;
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function DynamicSectionField({ fieldDef, isCollapsed, onToggle }: DynamicSectionFieldProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {fieldDef.label}
      </span>
      <ChevronDown className={`h-5 w-5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
    </button>
  );
}
```

### Anti-Patterns to Avoid
- **eval() / new Function():** 절대 사용 금지. XSS 위험. STATE.md에서도 명시적으로 금지 [VERIFIED: STATE.md]
- **전체 form watch:** `watch()` 를 인자 없이 호출하면 모든 필드 변경에 리렌더. 반드시 `useWatch({ name: [...sourceFieldIds] })`로 필요한 필드만 구독 [ASSUMED]
- **Zod 스키마를 렌더 마다 재생성:** useMemo dependency를 fieldVisibility로 정확히 설정하여 불필요한 재생성 방지 [ASSUMED]
- **섹션 숨김 시 값 미초기화:** D-04에 따라 숨겨진 필드 값은 반드시 초기화 (reset). setValue로 빈 값 설정 필요

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 폼 필드 값 변경 감지 | Custom state subscription | react-hook-form `useWatch` | RHF가 이미 프록시 기반 구독 최적화 수행 [VERIFIED: 이미 사용 중] |
| Zod 스키마 생성 | 수동 검증 로직 | 기존 `schemaToZod` 확장 | 이미 안정적으로 작동 중, 조건부 required만 추가 [VERIFIED: schemaToZod.ts 확인] |
| 탭 UI | Custom tab 구현 | @headlessui/react `Tab` | PropertyPanel에서 이미 사용, 접근성 보장 [VERIFIED: PropertyPanel.tsx] |
| 그래프 순환 감지 | 외부 그래프 라이브러리 | DFS 직접 구현 (~40줄) | 노드 수 < 100, 외부 라이브러리 과잉. 순수 함수로 테스트 용이 |
| 계산 필드 연산 | expr-eval 라이브러리 | 직접 switch문 (~20줄) | 4개 연산만 지원, 라이브러리 오버헤드 불필요 |

**Key insight:** 이 페이즈의 모든 로직은 순수 함수로 구현 가능 (evaluateConditions, executeCalculation, detectCircularDeps). 이는 단위 테스트를 쉽게 만들고, 백엔드 Java 구현과 1:1 대응을 가능하게 한다.

## Common Pitfalls

### Pitfall 1: useWatch + Zod resolver 재생성 시 무한 루프
**What goes wrong:** fieldVisibility가 변경 → zodSchema 재생성 → resolver 변경 → RHF 내부 재검증 → 값 변경 이벤트 → fieldVisibility 변경 → 무한 루프
**Why it happens:** useWatch 반환값이 객체 참조이므로 useMemo dependency가 매번 새로운 참조로 평가
**How to avoid:** (1) useWatch 반환값을 JSON.stringify로 안정화하거나, (2) evaluateConditions 결과를 이전 결과와 shallow compare하여 변경 없으면 이전 참조 유지. useRef + 비교 패턴 권장
**Warning signs:** 콘솔에 "Maximum update depth exceeded" 에러

### Pitfall 2: 숨겨진 필드 값이 제출 데이터에 포함
**What goes wrong:** 조건부로 숨겨진 필드의 값이 초기화되지 않아 JSON 데이터에 남음
**Why it happens:** DOM에서 제거해도 RHF 내부 state에 값이 남아있음
**How to avoid:** 필드 숨김 시 `setValue(fieldId, undefined)` 또는 `unregister(fieldId)` 호출. unregister가 더 깔끔하지만, 다시 표시할 때 register가 필요. setValue + 제출 시 필터링이 더 안전
**Warning signs:** 서버에 불필요한 데이터가 전달됨

### Pitfall 3: 섹션 숨김 시 하위 필드 값 초기화 누락
**What goes wrong:** section 필드가 조건부로 숨겨질 때, 해당 섹션에 속한 필드들의 값이 초기화되지 않음
**Why it happens:** 섹션과 필드 간의 관계가 명시적이지 않음 (순서 기반)
**How to avoid:** 섹션 숨김 시 해당 섹션에 속한 모든 필드 ID를 계산하여 일괄 초기화. 섹션 그룹화 로직을 유틸 함수로 분리
**Warning signs:** 숨겨진 섹션 내 필드 값이 제출됨

### Pitfall 4: 테이블 컬럼 참조 파싱 오류
**What goes wrong:** `table.columnId` 형식의 sourceField를 파싱할 때 필드 ID에 점(.)이 포함된 경우 오작동
**Why it happens:** `split('.')` 이 ID 내의 점도 분리
**How to avoid:** nanoid로 생성된 필드 ID에는 점이 포함되지 않으므로 현재는 안전. 단, 방어적으로 `indexOf('.')` + `slice`로 첫 번째 점만 기준으로 분리
**Warning signs:** 계산 결과가 NaN

### Pitfall 5: 백엔드 순환 검증과 프론트엔드 로직 불일치
**What goes wrong:** 프론트에서 통과한 규칙이 백엔드에서 거부되거나, 그 반대
**Why it happens:** 두 구현이 독립적으로 작성되어 엣지 케이스 처리가 다름
**How to avoid:** 동일한 테스트 케이스 세트를 프론트/백 양쪽에서 실행. 알고리즘을 최대한 단순하게 유지 (표준 DFS 3-color)
**Warning signs:** "프론트에서는 저장 가능한데 백엔드에서 400 에러"

## Code Examples

### 조건 평가 순수 함수
```typescript
// evaluateConditions.ts
// Source: 프로젝트 아키텍처 설계 (CONTEXT.md D-01~D-07 기반)

export interface ConditionalRule {
  targetFieldId: string;
  action: 'show' | 'hide' | 'require';
  matchType: 'all' | 'any';
  conditions: {
    sourceFieldId: string;
    operator: 'equals' | 'not_equals' | 'is_empty' | 'is_not_empty';
    value?: string;
  }[];
}

export interface FieldVisibility {
  visible: boolean;
  conditionallyRequired: boolean;
}

export function evaluateConditions(
  rules: ConditionalRule[],
  formValues: Record<string, unknown>,
  fields: { id: string; required: boolean }[],
): Map<string, FieldVisibility> {
  const result = new Map<string, FieldVisibility>();

  // 기본값: 모든 필드 visible, conditionallyRequired = false
  for (const field of fields) {
    result.set(field.id, { visible: true, conditionallyRequired: false });
  }

  for (const rule of rules) {
    const matched = evaluateMatch(rule, formValues);

    const state = result.get(rule.targetFieldId);
    if (!state) continue;

    switch (rule.action) {
      case 'show':
        if (!matched) state.visible = false;
        break;
      case 'hide':
        if (matched) state.visible = false;
        break;
      case 'require':
        if (matched) state.conditionallyRequired = true;
        break;
    }
  }

  return result;
}

function evaluateMatch(rule: ConditionalRule, values: Record<string, unknown>): boolean {
  const results = rule.conditions.map(cond => {
    const val = values[cond.sourceFieldId];
    switch (cond.operator) {
      case 'equals': return String(val ?? '') === cond.value;
      case 'not_equals': return String(val ?? '') !== cond.value;
      case 'is_empty': return val == null || String(val) === '';
      case 'is_not_empty': return val != null && String(val) !== '';
    }
  });

  return rule.matchType === 'all'
    ? results.every(Boolean)
    : results.some(Boolean);
}
```

### BuilderState에 규칙 관련 액션 추가
```typescript
// builder.ts 타입 확장
export type BuilderAction =
  | /* ... 기존 액션들 ... */
  | { type: 'SET_CONDITIONAL_RULES'; rules: ConditionalRule[] }
  | { type: 'ADD_CONDITIONAL_RULE'; rule: ConditionalRule }
  | { type: 'UPDATE_CONDITIONAL_RULE'; index: number; rule: ConditionalRule }
  | { type: 'REMOVE_CONDITIONAL_RULE'; index: number }
  | { type: 'SET_CALCULATION_RULES'; rules: CalculationRule[] }
  | { type: 'ADD_CALCULATION_RULE'; rule: CalculationRule }
  | { type: 'UPDATE_CALCULATION_RULE'; index: number; rule: CalculationRule }
  | { type: 'REMOVE_CALCULATION_RULE'; index: number };
```

### 백엔드 순환 검증 (Java)
```java
// CircularDependencyValidator.java
// Source: 표준 DFS 3-color 알고리즘

@Component
public class CircularDependencyValidator {

    public Optional<List<String>> detectCycle(Map<String, Object> schemaDefinition) {
        // 1. conditionalRules + calculationRules에서 그래프 구축
        Map<String, Set<String>> graph = buildGraph(schemaDefinition);

        // 2. DFS 3-color
        Map<String, Integer> color = new HashMap<>(); // 0=WHITE, 1=GRAY, 2=BLACK
        for (String node : graph.keySet()) {
            if (color.getOrDefault(node, 0) == 0) {
                List<String> cycle = dfs(node, graph, color, new HashMap<>());
                if (cycle != null) return Optional.of(cycle);
            }
        }
        return Optional.empty();
    }

    // ... buildGraph, dfs 구현
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-hook-form watch() (전체) | useWatch({ name: [...] }) (선택적) | RHF v7+ | 리렌더 범위 축소, 성능 향상 |
| 외부 form builder 라이브러리 | 직접 구현 (도메인 특화) | 프로젝트 결정 | 완전한 제어권, 의존성 최소화 |
| Zod v3 .optional().nullable() | Zod v4 simplified API | 2025 | schemaToZod에서 이미 v4 사용 중 [VERIFIED: zod 4.3.6] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | useWatch 반환값이 매번 새 객체 참조를 생성하여 useMemo dependency 주의 필요 | Pitfall 1 | 무한 루프 발생 가능 — 실제 동작 테스트로 확인 필요 |
| A2 | resolver 변경 시 RHF가 자동 재검증 수행 | Pattern 2 | 조건부 required 전환 시 에러 상태 불일치 가능 |
| A3 | 소수점 처리에 toFixed(2) 또는 Math.round 기반 권장 | Pattern 4 | 금액 계산 정밀도 이슈 — 사용자 요구사항에 따라 조정 |
| A4 | unregister보다 setValue + 제출 필터링이 안전 | Pitfall 2 | 필드 재표시 시 register 재호출 필요성 불확실 |

## Open Questions

1. **소수점 자릿수 정책**
   - What we know: 계산 필드는 number 타입, 금액(원화) 관련 사용 예상
   - What's unclear: 소수점 몇 자리까지 표시할지
   - Recommendation: 기본 정수 처리 (원화 기준), config에 `decimalPlaces` 옵션 추가 가능

2. **복수 규칙 간 우선순위**
   - What we know: 하나의 필드에 여러 규칙이 적용될 수 있음 (예: rule1이 show, rule2가 hide)
   - What's unclear: 충돌 시 어느 것이 우선하는지
   - Recommendation: "숨김이 우선" 정책 — hide/불충족 show가 하나라도 있으면 숨김. require는 visible일 때만 적용

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (설치 필요) 또는 수동 검증 |
| Config file | none -- 프론트엔드 테스트 프레임워크 미설치 |
| Quick run command | 수동 브라우저 검증 |
| Full suite command | 수동 브라우저 검증 |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOGIC-01 | 조건부 규칙에 따른 필드 표시/숨기기/필수 | manual + unit | 순수 함수 unit test 가능 | Wave 0 |
| LOGIC-02 | 순환 의존성 감지 및 저장 차단 | manual + unit | 순수 함수 unit test 가능 | Wave 0 |
| LOGIC-03 | 계산 필드 자동 연산 | manual + unit | 순수 함수 unit test 가능 | Wave 0 |
| LOGIC-04 | 섹션 그룹화 및 접기/펼치기 | manual | 브라우저 검증 | N/A |

### Wave 0 Gaps
- 프론트엔드 테스트 프레임워크 미설치 (vitest 등). 순수 함수는 Node.js에서 직접 테스트 가능하나, 컴포넌트 테스트는 불가
- 핵심 순수 함수 3개 (evaluateConditions, executeCalculation, detectCircularDeps)는 프레임워크 없이도 로직 검증 가능 -- 수동 브라우저 테스트로 대체

### Sampling Rate
- **Per task commit:** 브라우저에서 빌더 열고 조건/계산/섹션 동작 수동 확인
- **Phase gate:** 모든 Success Criteria 4개 수동 검증

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A |
| V3 Session Management | no | N/A |
| V4 Access Control | yes | 기존 ADMIN/SUPER_ADMIN 권한 체크 유지 (템플릿 수정 API) |
| V5 Input Validation | yes | 백엔드 순환 검증 (D-16), schemaDefinition JSON 구조 검증 |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 조건부 규칙에 악성 코드 삽입 | Tampering | JSON 스키마 구조만 허용, eval/Function 사용 금지 [VERIFIED: STATE.md] |
| 프론트엔드 순환 검증 우회 | Tampering | 백엔드에서도 동일한 순환 검증 수행 (D-16) |
| 계산 필드 값 조작 | Tampering | D-10에 따라 계산은 FE 전용, BE는 제출값 그대로 저장 — 의도적 설계 |

## Sources

### Primary (HIGH confidence)
- 프로젝트 소스코드 직접 확인: dynamicForm.ts, builder.ts, schemaToZod.ts, DynamicForm.tsx, PropertyPanel.tsx, useBuilderReducer.ts, AdminTemplateService.java
- package.json + node_modules 버전 확인: react-hook-form 7.72.0, zod 4.3.6
- CONTEXT.md D-01~D-19 결정사항

### Secondary (MEDIUM confidence)
- npm registry: expr-eval 2.0.2, @types/expr-eval 1.1.2 [VERIFIED: npm view]

### Tertiary (LOW confidence)
- react-hook-form useWatch 내부 동작 세부사항 (A1, A2) — 실제 동작 테스트 필요

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 모든 의존성이 이미 설치되어 있고 프로젝트에서 사용 중
- Architecture: HIGH - CONTEXT.md에서 모든 주요 결정이 확정됨, 기존 코드 패턴이 명확
- Pitfalls: MEDIUM - useWatch + dynamic resolver 조합의 엣지 케이스는 실제 테스트 필요

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (안정적인 스택, 외부 의존성 변경 없음)
