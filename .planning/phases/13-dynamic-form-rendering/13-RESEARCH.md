# Phase 13: Dynamic Form Rendering - Research

**Researched:** 2026-04-05
**Domain:** React dynamic form rendering from JSON schema, Zod runtime validation, react-hook-form integration
**Confidence:** HIGH

## Summary

Phase 13은 Phase 12에서 구축한 JSON 스키마 인프라를 기반으로, 프론트엔드에서 동적 양식을 편집/읽기 모드로 렌더링하는 것이 핵심이다. 기존 6개 하드코딩 양식(GENERAL, EXPENSE 등)과 동일한 UX 품질을 제공하되, JSON 스키마에서 런타임에 폼을 생성한다.

기술적으로 가장 중요한 부분은 (1) JSON 스키마를 Zod v4 스키마로 런타임 변환하는 `schemaToZod` 유틸리티, (2) 8개 필드 타입별 렌더링 컴포넌트, (3) 기존 DocumentEditorPage/DocumentDetailPage에 fallback 분기 추가이다. 기존 코드 패턴(react-hook-form + zodResolver, useFieldArray, Tailwind 스타일링)을 그대로 재사용하므로 새로운 아키텍처 결정은 최소화된다.

백엔드는 Phase 12에서 대부분 완성되었으나, 두 가지 API 확장이 필요하다: (1) 일반 사용자가 템플릿 스키마를 조회할 수 있는 공개 엔드포인트, (2) DocumentDetailResponse에 schemaDefinitionSnapshot 포함. 새 npm 의존성은 `@headlessui/react`(select Combobox)와 `react-day-picker`(date picker) 두 가지이다.

**Primary recommendation:** 기존 react-hook-form + Zod 패턴을 그대로 사용하여 `schemaToZod()` 변환 함수를 작성하고, 필드 타입별 렌더링 컴포넌트를 개별 파일로 분리하라.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Registry fallback 패턴 -- `TEMPLATE_REGISTRY[code]`에 없는 templateCode일 때 `DynamicForm`/`DynamicReadOnly` 컴포넌트를 자동 렌더링. 기존 EditorPage/DetailPage 최소 변경
- **D-02:** 기존 제목(title) 필드는 DocumentEditorPage가 관리 유지 -- DynamicForm은 스키마 필드만 렌더링. 하드코딩 양식과 동일한 UX
- **D-03:** TemplateSelectionModal에서 하드코딩 6개 + 동적 템플릿을 통합 리스트로 표시. API에서 동적 템플릿 가져와 하단에 추가. 사용자 입장에서 구분 없음
- **D-04:** select 필드는 Headless UI Combobox 사용 -- 검색 가능한 드롭다운으로 옵션이 많을 때도 편리
- **D-05:** date 필드는 react-day-picker 라이브러리 사용 -- 일관된 커스텀 캘린더 UI, 브라우저 무관
- **D-06:** table 필드는 하단 "+ 행 추가" 버튼 + 행별 X 삭제 버튼. 기존 ExpenseForm과 동일한 패턴으로 일관성 유지
- **D-07:** 단일 칼럼 스택 레이아웃 -- 모든 필드가 세로로 한 칸씩 쌓임. 라벨은 필드 위, 필수는 라벨 옆 * 표시
- **D-08:** 폼 마운트 시 useMemo로 Zod 스키마 한 번 생성 -> react-hook-form zodResolver로 전달. 실시간 인라인 검증 지원
- **D-09:** 한국어 에러 메시지 직접 생성 -- schemaToZod 변환 시 필드 label 활용하여 "제목을 입력해주세요" 같은 한국어 메시지 생성
- **D-10:** table 필드 Zod는 중첩 자동 변환 -- columns를 재귀적으로 z.object 변환, z.array(...).min(minRows).max(maxRows)로 행 수 제한
- **D-11:** 편집 모드와 동일한 폼 구조 유지 -- 라벨-값 레이아웃으로 표시, input 대신 텍스트 렌더링
- **D-12:** 빈 필드는 라벨 + "---" (em dash) 표시

### Claude's Discretion
- DynamicForm/DynamicReadOnly 컴포넌트 내부 구조 및 파일 분리 방식
- schemaToZod 유틸리티 함수 구조 및 위치
- checkbox/radio 필드의 세부 스타일링
- staticText/hidden 필드의 렌더링 처리
- number 필드의 string->number coerce 처리 방식
- Headless UI / react-day-picker 세부 설정 및 스타일링

### Deferred Ideas (OUT OF SCOPE)
- 필드 width 설정 (full/half) -- Phase 14 Builder UI에서 스키마에 width 속성 추가 시 지원
- 조건부 필드 표시/숨김 -- Phase 15 Advanced Logic에서 구현
- 계산 필드 자동 계산 -- Phase 15 Advanced Logic에서 구현
- 옵션 세트 관리 UI -- Phase 14 Builder UI에서 함께 구현
- PDF 출력용 레이아웃 -- 별도 phase에서 검토
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RNDR-01 | User can fill out a dynamic form rendered from JSON schema in edit mode (all field types functional) | DynamicForm 컴포넌트 + 8개 필드 타입별 렌더러 + registry fallback 패턴으로 구현. 기존 TemplateEditProps 인터페이스 준수 |
| RNDR-02 | User can view submitted documents rendered in read-only mode from stored JSON schema + form_data | DynamicReadOnly 컴포넌트 + schemaDefinitionSnapshot API 확장. 기존 TemplateReadOnlyProps 인터페이스 준수 |
| RNDR-03 | Frontend generates Zod validation schema at runtime from JSON schema (required, min/max, type checks) | schemaToZod 유틸리티 함수 -- Zod v4 API로 JSON 필드 정의를 z.object()로 동적 변환. zodResolver로 RHF 연결 |
| RNDR-04 | Table field supports dynamic rows with defined columns, row add/remove, and per-cell validation | useFieldArray 패턴 (ExpenseForm과 동일) + 중첩 Zod array/object 스키마로 셀별 검증 |
</phase_requirements>

## Standard Stack

### Core (이미 설치됨)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | 7.72.x | 폼 상태 관리 | 프로젝트 전체에서 사용 중. useFieldArray로 테이블 동적 행 지원 |
| @hookform/resolvers | 5.2.x | Zod <-> RHF 연결 | zodResolver로 런타임 Zod 스키마 연결 |
| zod | 4.3.x | 런타임 검증 스키마 | 프로젝트 전체에서 사용 중. v4 API (`{ error: 'msg' }` 문법) |
| date-fns | 4.1.x | 날짜 포맷팅 | 이미 설치됨. format(), parse()로 YYYY-MM-DD 처리 |
| lucide-react | 1.7.x | 아이콘 | Plus, X, Calendar 등 기존 아이콘 재사용 |

### New Dependencies (설치 필요)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @headlessui/react | 2.2.x | select 필드 Combobox | D-04 결정. 검색 가능한 드롭다운. ARIA 자동 지원 |
| react-day-picker | 9.14.x | date 필드 캘린더 | D-05 결정. 브라우저 독립적 캘린더 UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @headlessui/react Combobox | Native HTML select | 검색 기능 없음, 옵션 많을 때 UX 저하 |
| react-day-picker | Native input[type=date] | 브라우저마다 다른 UI, 커스터마이즈 불가 |
| 직접 schemaToZod 구현 | @anatine/zod-mock 등 | 범용 라이브러리는 커스텀 JSON 포맷과 맞지 않음. 직접 구현이 더 적합 |

**Installation:**
```bash
cd frontend && npm install @headlessui/react@^2.2 react-day-picker@^9.14
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/features/document/
├── components/
│   ├── templates/
│   │   ├── templateRegistry.ts          # 기존 + fallback 분기 추가
│   │   ├── DynamicForm.tsx              # 동적 편집 폼 (메인 컴포넌트)
│   │   ├── DynamicReadOnly.tsx          # 동적 읽기 전용
│   │   └── dynamic/                     # 동적 필드 컴포넌트 디렉토리
│   │       ├── DynamicTextField.tsx
│   │       ├── DynamicTextareaField.tsx
│   │       ├── DynamicNumberField.tsx
│   │       ├── DynamicDateField.tsx
│   │       ├── DynamicSelectField.tsx
│   │       ├── DynamicTableField.tsx
│   │       ├── DynamicStaticText.tsx
│   │       ├── DynamicHiddenField.tsx
│   │       ├── DynamicFieldWrapper.tsx  # 라벨 + 에러 래퍼
│   │       └── DynamicFieldRenderer.tsx # type -> component 디스패치
│   └── TemplateSelectionModal.tsx       # 동적 템플릿 통합 (수정)
├── utils/
│   └── schemaToZod.ts                   # JSON schema -> Zod v4 변환
├── types/
│   └── dynamicForm.ts                   # TypeScript 타입 정의 (스키마 인터페이스)
├── api/
│   └── templateApi.ts                   # 공개 템플릿 상세 API 추가
└── pages/
    ├── DocumentEditorPage.tsx           # fallback 분기 추가 (수정)
    └── DocumentDetailPage.tsx           # fallback 분기 추가 (수정)
```

### Pattern 1: Registry Fallback (D-01)
**What:** TEMPLATE_REGISTRY에 없는 templateCode일 때 DynamicForm/DynamicReadOnly로 자동 fallback
**When to use:** DocumentEditorPage, DocumentDetailPage에서 템플릿 코드 기반 분기
**Example:**
```typescript
// DocumentEditorPage.tsx (196행 근처 수정)
const templateEntry = TEMPLATE_REGISTRY[resolvedTemplateCode];
const isDynamic = !templateEntry;

// EditComponent 대신 조건부 렌더링
{isDynamic ? (
  <DynamicForm
    documentId={savedDocId}
    templateCode={resolvedTemplateCode}
    initialData={existingDoc ? { title: existingDoc.title, formData: existingDoc.formData ?? undefined } : undefined}
    onSave={handleSave}
  />
) : (
  <EditComponent ... />
)}
```

### Pattern 2: schemaToZod Runtime Conversion (D-08, D-09, D-10)
**What:** JSON 스키마의 fields 배열을 Zod v4 스키마로 동적 변환
**When to use:** DynamicForm 마운트 시 useMemo 안에서 한 번 실행
**Example:**
```typescript
// utils/schemaToZod.ts
import { z } from 'zod';
import type { FieldDefinition } from '../types/dynamicForm';

export function schemaToZod(fields: FieldDefinition[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodType> = {};
  
  for (const field of fields) {
    if (field.type === 'staticText' || field.type === 'hidden') continue;
    
    let zodField: z.ZodType;
    
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'select':
      case 'date':
        zodField = z.string();
        if (field.config?.maxLength) {
          zodField = (zodField as z.ZodString).max(field.config.maxLength, {
            error: `${field.label}은(는) ${field.config.maxLength}자 이하여야 합니다`,
          });
        }
        if (field.required) {
          zodField = (zodField as z.ZodString).min(1, {
            error: `${field.label}을(를) 입력해주세요`,
          });
        } else {
          zodField = zodField.optional();
        }
        break;
        
      case 'number':
        zodField = z.coerce.number();
        if (field.config?.min != null) {
          zodField = (zodField as z.ZodNumber).min(field.config.min, {
            error: `${field.label}은(는) ${field.config.min} 이상이어야 합니다`,
          });
        }
        if (field.config?.max != null) {
          zodField = (zodField as z.ZodNumber).max(field.config.max, {
            error: `${field.label}은(는) ${field.config.max} 이하여야 합니다`,
          });
        }
        if (!field.required) {
          zodField = zodField.optional();
        }
        break;
        
      case 'table':
        zodField = buildTableZod(field);
        break;
        
      default:
        zodField = z.any();
    }
    
    shape[field.id] = zodField;
  }
  
  return z.object(shape);
}
```

### Pattern 3: useFieldArray for Table Fields (D-06, D-10)
**What:** react-hook-form의 useFieldArray로 테이블 행 동적 추가/삭제
**When to use:** table 타입 필드 렌더링 시
**Example:**
```typescript
// 기존 ExpenseForm과 동일한 패턴
const { fields, append, remove } = useFieldArray({
  control,
  name: `${fieldId}`, // 동적 필드 ID 사용
});
```

### Pattern 4: Dual Schema Source (편집 vs 읽기)
**What:** 새 문서 작성 시 API에서 현재 스키마 조회, 기존 문서 조회 시 스냅샷에서 스키마 로드
**When to use:** DynamicForm/DynamicReadOnly 초기화 시
**Schema source decision tree:**
```
새 문서 (documentId === null):
  -> GET /api/v1/templates/{code}/schema -> 현재 최신 스키마
  
기존 문서 편집/조회 (documentId !== null):
  -> DocumentDetailResponse.schemaDefinitionSnapshot -> 문서 생성 시점 스냅샷
  
스냅샷 없는 기존 문서 (하드코딩 양식):
  -> TEMPLATE_REGISTRY fallback (이 케이스는 발생하지 않음 -- 동적 문서만 해당)
```

### Anti-Patterns to Avoid
- **eval() / new Function()으로 동적 검증 금지:** Zod v4의 타입 안전한 빌더 패턴만 사용
- **하드코딩 양식 컴포넌트 수정 금지:** 6개 기존 양식은 그대로 유지. DynamicForm은 완전 별도 컴포넌트
- **i18n 키로 동적 필드 에러 메시지 관리 금지:** 스키마의 label에서 직접 한국어 메시지 생성 (D-09)
- **전체 폼을 하나의 거대 컴포넌트로 만들기 금지:** 필드 타입별 개별 컴포넌트로 분리하여 유지보수성 확보

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 검색 가능한 드롭다운 | Custom combobox | @headlessui/react Combobox | ARIA 접근성, 키보드 탐색, 포커스 관리 자동 처리 |
| 캘린더 UI | Custom date picker | react-day-picker | 국제화, 키보드 탐색, 접근성 모두 내장 |
| 폼 상태 관리 | Custom state + onChange | react-hook-form | 이미 프로젝트 표준. useFieldArray, Controller 등 풍부한 기능 |
| 런타임 검증 | Custom validation loop | Zod + zodResolver | 타입 안전성, 에러 메시지 구조화, RHF 자동 연동 |
| 날짜 포맷팅 | Custom date utils | date-fns format/parse | 이미 설치됨. 로케일 지원, 신뢰성 검증됨 |

**Key insight:** 이 phase의 핵심 창작물은 `schemaToZod` 변환 함수와 필드 타입별 렌더러뿐이다. 나머지는 기존 라이브러리와 패턴을 100% 재사용한다.

## Common Pitfalls

### Pitfall 1: Zod v4 API 차이
**What goes wrong:** Zod v3 문법으로 코드를 작성하면 런타임 에러 발생
**Why it happens:** 이 프로젝트는 Zod v4 (4.3.6)을 사용. v3과 에러 메시지 API가 다름
**How to avoid:** 기존 코드의 패턴을 참고. `{ error: 'message' }` 문법 사용 (v3의 `{ message: 'msg' }`가 아님). 예: `z.string().min(1, { error: '필수입니다' })`
**Warning signs:** `message` 키를 사용하면 에러 메시지가 표시되지 않거나 기본 영어 메시지가 나옴

### Pitfall 2: useFieldArray와 동적 테이블의 defaultValues
**What goes wrong:** 테이블 행 추가 시 빈 객체로 append하면 Zod 검증에서 undefined 에러
**Why it happens:** useFieldArray의 append에 올바른 기본값 객체가 필요
**How to avoid:** 테이블 columns에서 기본값 객체를 동적 생성하는 유틸리티 함수 작성. 예: `buildDefaultRow(columns) -> { col1: '', col2: 0, ... }`
**Warning signs:** "Cannot read property of undefined" 에러, 행 추가 후 입력이 안 되는 현상

### Pitfall 3: number 필드의 string -> number coerce
**What goes wrong:** HTML input[type=number]는 항상 string을 반환. Zod number 검증 실패
**Why it happens:** react-hook-form register()는 DOM 값을 그대로 가져오므로 문자열
**How to avoid:** `z.coerce.number()` 사용 또는 register에 `{ valueAsNumber: true }` 옵션. 기존 ExpenseForm이 `{ valueAsNumber: true }`를 사용하므로 동일 패턴 적용
**Warning signs:** "Expected number, received string" Zod 에러

### Pitfall 4: 스키마 소스 분기 누락
**What goes wrong:** 새 문서 작성 시 스키마를 어디서 가져올지 모름. 기존 문서는 스냅샷 사용
**Why it happens:** 새 문서 = 템플릿 API에서 현재 스키마, 기존 문서 = document의 schemaDefinitionSnapshot
**How to avoid:** DynamicForm에서 `documentId`와 `initialData`로 분기. documentId가 null이면 templateCode로 API 호출, 아니면 initialData에서 스냅샷 사용
**Warning signs:** 새 문서 작성 시 빈 폼, 기존 문서 조회 시 빈 폼

### Pitfall 5: DocumentDetailResponse에 schemaDefinitionSnapshot 누락
**What goes wrong:** 프론트엔드에서 읽기 전용 렌더링을 위한 스키마 데이터를 받지 못함
**Why it happens:** Phase 12에서 DocumentContent에 schemaDefinitionSnapshot 필드를 추가했지만 DocumentDetailResponse DTO에는 포함하지 않음
**How to avoid:** 백엔드 수정 필요 -- DocumentDetailResponse에 schemaDefinitionSnapshot 필드 추가, DocumentMapper에 매핑 추가
**Warning signs:** 프론트엔드에서 문서 상세 조회 시 schemaDefinitionSnapshot이 항상 null/undefined

### Pitfall 6: Headless UI v2 Popover/Combobox z-index 충돌
**What goes wrong:** Combobox 드롭다운이 다른 UI 요소 뒤에 숨겨짐
**Why it happens:** Tailwind의 기본 z-index와 Headless UI 포탈의 z-index가 충돌
**How to avoid:** Combobox Options에 `className="z-50"` 지정. 기존 TemplateSelectionModal은 `z-50`을 사용하므로 같은 수준 유지
**Warning signs:** 드롭다운이 보이지 않거나 다른 요소 뒤에 렌더링

## Code Examples

### schemaToZod 변환 -- Zod v4 검증 패턴 (기존 코드 기반)
```typescript
// 기존 generalSchema.ts에서 확인된 Zod v4 패턴:
import { z } from 'zod';

// Zod v4에서는 { error: 'message' } 사용 (v3의 { message: 'msg' }가 아님)
const field = z.string().min(1, { error: '제목을 입력해주세요' }).max(300);

// number coerce 패턴 (기존 expenseSchema.ts 참고)
const numField = z.number().int().min(1, { error: '수량을 올바르게 입력해주세요' });

// 배열 검증 패턴 (table 필드에 사용)
const tableField = z.array(
  z.object({
    colId1: z.string().min(1, { error: '항목명을 입력해주세요' }),
    colId2: z.number().min(0),
  })
).min(1, { error: '최소 1개의 행이 필요합니다' });
```

### DynamicForm 컴포넌트 구조 (TemplateEditProps 준수)
```typescript
// GeneralForm.tsx와 동일한 인터페이스 구현
import { useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { schemaToZod } from '../../utils/schemaToZod';
import type { TemplateEditProps } from './templateRegistry';
import type { SchemaDefinition } from '../../types/dynamicForm';

interface DynamicFormProps extends TemplateEditProps {
  templateCode: string;
  schemaDefinition?: SchemaDefinition; // 새 문서용: API에서 조회, 기존 문서용: 스냅샷
}
```

### useFieldArray 테이블 패턴 (기존 ExpenseForm 기반)
```typescript
// ExpenseForm.tsx:45에서 확인된 패턴 그대로 적용
const { fields, append, remove } = useFieldArray({ control, name: fieldId });

// 행 추가 시 동적 기본값 생성
const defaultRow = columns.reduce((acc, col) => {
  acc[col.id] = col.type === 'number' ? 0 : '';
  return acc;
}, {} as Record<string, any>);

append(defaultRow);
```

### Headless UI Combobox 패턴 (select 필드)
```typescript
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption, ComboboxButton } from '@headlessui/react';

// Headless UI v2 API -- 새 컴포넌트 기반 API 사용
<Combobox value={selectedValue} onChange={onChange}>
  <div className="relative">
    <ComboboxInput
      className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
      displayValue={(val: string) => options.find(o => o.value === val)?.label ?? ''}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={`${label} 선택`}
    />
    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
      <ChevronDown className="h-4 w-4 text-gray-400" />
    </ComboboxButton>
  </div>
  <ComboboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white border shadow-lg">
    {filteredOptions.map((option) => (
      <ComboboxOption key={option.value} value={option.value}>
        {option.label}
      </ComboboxOption>
    ))}
  </ComboboxOptions>
</Combobox>
```

### react-day-picker v9 날짜 선택 패턴
```typescript
import { DayPicker } from 'react-day-picker';
import { format, parse } from 'date-fns';
import { ko } from 'date-fns/locale';

// Popover 내부에 DayPicker 렌더링
<DayPicker
  mode="single"
  selected={selectedDate}
  onSelect={(date) => {
    onChange(date ? format(date, 'yyyy-MM-dd') : '');
  }}
  locale={ko}
/>
```

## Backend API 확장 요구사항

Phase 12에서 대부분의 백엔드 인프라가 구축되었으나, Phase 13 프론트엔드가 동작하려면 두 가지 API 확장이 필요하다.

### 1. 공개 템플릿 스키마 조회 API
**목적:** 새 문서 작성 시 일반 사용자가 템플릿의 현재 스키마를 조회
**현재 상태:** `/api/v1/admin/templates/{id}` (관리자 전용, ID 기반)
**필요한 엔드포인트:** `GET /api/v1/templates/{code}/schema` (공개, code 기반)
**반환값:** SchemaDefinition JSON (resolved options 포함)
**근거:** DynamicForm은 새 문서 작성 시 templateCode만 알고 있음. ID 기반이 아닌 code 기반 조회 필요

### 2. DocumentDetailResponse에 schemaDefinitionSnapshot 추가
**목적:** 기존 문서 조회/읽기 시 스키마 스냅샷을 프론트엔드에 전달
**현재 상태:** DocumentContent에 schemaDefinitionSnapshot 저장됨 (Phase 12), 하지만 DTO에 미포함
**필요한 변경:**
- `DocumentDetailResponse` record에 `String schemaDefinitionSnapshot` 필드 추가
- `DocumentMapper`에 `@Mapping(target = "schemaDefinitionSnapshot", source = "content.schemaDefinitionSnapshot")` 추가
- 프론트엔드 `DocumentDetailResponse` 타입에 `schemaDefinitionSnapshot?: string | null` 추가

## TypeScript 타입 정의

프론트엔드에서 백엔드 SchemaDefinition/FieldDefinition/FieldConfig에 대응하는 TypeScript 인터페이스 필요.

```typescript
// types/dynamicForm.ts
export interface SchemaDefinition {
  version: number;
  fields: FieldDefinition[];
  conditionalRules: unknown[];  // Phase 15
  calculationRules: unknown[];  // Phase 15
}

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  config?: FieldConfig;
}

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'table' | 'staticText' | 'hidden';

export interface FieldConfig {
  // text/textarea
  placeholder?: string;
  maxLength?: number;
  // number
  min?: number;
  max?: number;
  unit?: string;
  // select
  optionSetId?: number;
  options?: OptionItem[];
  // table
  minRows?: number;
  maxRows?: number;
  columns?: FieldDefinition[];
  // staticText
  content?: string;
  // hidden
  defaultValue?: string;
}

export interface OptionItem {
  value: string;
  label: string;
  sortOrder: number;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod v3 `{ message: 'msg' }` | Zod v4 `{ error: 'msg' }` | 2025 | 이 프로젝트는 v4 사용. 모든 에러 메시지 문법이 다름 |
| @headlessui/react v1 (render props) | v2 (component-based API) | 2024 | ComboboxInput, ComboboxOptions 등 새 컴포넌트 API |
| react-day-picker v8 (DayPicker mode) | v9 (DayPicker mode="single") | 2024 | API 구조 변경됨. v9 문서 참고 필요 |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @headlessui/react | select 필드 (D-04) | 미설치 | -- | npm install 필요 |
| react-day-picker | date 필드 (D-05) | 미설치 | -- | npm install 필요 |
| react-hook-form | 폼 상태 관리 | 설치됨 | 7.72.x | -- |
| zod | 런타임 검증 | 설치됨 | 4.3.x | -- |
| date-fns | 날짜 포맷팅 | 설치됨 | 4.1.x | -- |

**Missing dependencies with no fallback:**
- @headlessui/react: D-04 잠긴 결정, 대체 불가
- react-day-picker: D-05 잠긴 결정, 대체 불가

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test (backend), Manual browser testing (frontend) |
| Config file | backend/build.gradle.kts (JUnit 5 auto), frontend에는 테스트 프레임워크 미설치 |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.template.*"` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RNDR-01 | 동적 폼 편집 모드 렌더링 | manual (브라우저) | -- | -- |
| RNDR-02 | 읽기 전용 모드 렌더링 | manual (브라우저) | -- | -- |
| RNDR-03 | Zod 런타임 스키마 생성 | unit (backend 이미 테스트됨) | `./gradlew test --tests "*.DynamicFormValidationTest"` | Wave 0 |
| RNDR-04 | 테이블 동적 행 + 셀 검증 | manual + backend unit | `./gradlew test --tests "*.DynamicFormValidationTest"` | Wave 0 |

### Sampling Rate
- **Per task commit:** Manual browser verification (동적 폼 렌더링, 필드 입력, 검증 에러 확인)
- **Per wave merge:** `cd backend && ./gradlew test` (기존 테스트 회귀 확인)
- **Phase gate:** 전체 테스트 통과 + 브라우저에서 8개 필드 타입 모두 동작 확인

### Wave 0 Gaps
- [ ] 프론트엔드 단위 테스트 프레임워크 미설치 (Vitest 등) -- 이 phase에서는 수동 테스트로 충분
- [ ] schemaToZod 유틸리티의 단위 테스트 -- 프론트엔드 테스트 인프라 부재로 수동 검증

*(프론트엔드 테스트 프레임워크 도입은 별도 phase에서 검토. 현재는 백엔드 테스트 + 수동 브라우저 테스트로 커버)*

## Open Questions

1. **react-day-picker v9의 Popover 통합 방식**
   - What we know: v9는 DayPicker 컴포넌트만 제공, Popover는 별도 구현 필요
   - What's unclear: Headless UI의 Popover를 사용할지, 직접 state + absolute positioning을 할지
   - Recommendation: 간단한 state + 클릭 외부 감지로 구현 (Headless UI Popover는 과도). useRef + onClick outside 패턴

2. **TemplateSelectionModal에서 동적 템플릿 구분 방식**
   - What we know: `getActiveTemplates` API가 isCustom 필드를 포함하여 모든 템플릿 반환
   - What's unclear: 현재 TemplateSelectionModal이 `useTemplates()` 훅을 사용하며, 반환된 TemplateResponse에 isCustom이 포함됨
   - Recommendation: 기존 API 응답에 isCustom이 이미 포함되므로, 추가 API 호출 불필요. 동적 템플릿은 `isCustom === true`인 항목

3. **공개 템플릿 스키마 조회 API의 정확한 형태**
   - What we know: 새 문서 생성 시 templateCode로 스키마를 받아야 함
   - What's unclear: code 기반 조회 vs ID 기반 조회
   - Recommendation: `GET /api/v1/templates/{code}/schema` -- code 기반이 프론트엔드 라우팅과 자연스럽게 맞음

## Sources

### Primary (HIGH confidence)
- 프로젝트 코드 직접 분석: generalSchema.ts, expenseSchema.ts (Zod v4 패턴), ExpenseForm.tsx (useFieldArray 패턴), templateRegistry.ts (인터페이스 구조)
- Phase 12 구현 결과: 12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md (백엔드 스키마/검증 인프라)
- Phase 13 CONTEXT.md: D-01 ~ D-12 잠긴 결정사항
- Phase 13 UI-SPEC.md: 시각 디자인 계약서

### Secondary (MEDIUM confidence)
- npm registry 버전 확인: @headlessui/react 2.2.9, react-day-picker 9.14.0 (실시간 조회)
- Zod v4 API: `z.coerce.number()`, `{ error: 'msg' }` 문법 (코드 실행 검증)

### Tertiary (LOW confidence)
- react-day-picker v9 Popover 통합: 정확한 API는 공식 문서 확인 필요 (v8과 차이 있을 수 있음)
- Headless UI v2 Combobox: 실시간 검색 필터링 세부 API는 구현 시 공식 문서 참조 필요

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 기존 프로젝트 코드에서 직접 확인. 새 의존성 2개도 npm 버전 검증 완료
- Architecture: HIGH - 기존 코드 패턴(registry, useFieldArray, Zod) 그대로 확장. 새 패턴 없음
- Pitfalls: HIGH - Zod v4 API 차이, number coerce, 스키마 소스 분기 등 모두 코드에서 직접 확인

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days -- 안정적인 기존 스택 기반 확장)
