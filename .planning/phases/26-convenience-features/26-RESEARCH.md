# Phase 26: 편의 기능 - Research

**Researched:** 2026-04-13
**Domain:** 프론트엔드 템플릿 관리 UX 확장 (복제 / JSON Export / JSON Import / 프리셋)
**Confidence:** HIGH

## Summary

Phase 26은 **백엔드 변경 없이** `POST /admin/templates`와 `GET /admin/templates/{id}` 두 개의 기존 엔드포인트만 재사용하여 4가지 편의 기능을 프론트엔드에 추가합니다. CONTEXT.md에서 핵심 설계 결정 21개(D-01~D-21)가 모두 잠겨 있어, 연구의 역할은 "대안 탐색"이 아니라 **기존 코드와의 정합성 검증 + 누락 위험 식별**입니다.

코드베이스 검증 결과, CONTEXT.md에 언급된 파일 경로·함수 시그니처·재사용 지점은 **모두 실제 상태와 일치**합니다. `TemplateFormModal`은 `initialValues` prop 하나 추가만으로 복제/Import/프리셋 세 경로를 모두 흡수할 수 있는 구조이며(현재 `editingTemplate`이 null이면 빈 값으로 reset), 기존 Zod/RHF/sonner/lucide-react 패턴이 일관되게 사용되고 있어 새 모듈들도 동일 컨벤션으로 작성하면 됩니다.

**Primary recommendation:** 새 백엔드 엔드포인트를 만들지 말고, 프론트엔드에서 `templateImportSchema`(신규 Zod) 하나를 진실의 원천으로 삼아 Export·Import·프리셋 3개 경로를 같은 파이프라인으로 처리하세요. `TemplateFormModal`의 프리필 prop 확장이 단일 breaking change입니다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**복제 UX & 중복 처리**
- **D-01:** 복제 버튼은 `TemplateTable.tsx`의 각 행에 Edit 아이콘 옆 Copy 아이콘(lucide `Copy`) 형태로 추가. 드롭다운 메뉴 사용하지 않음.
- **D-02:** Copy 아이콘 클릭 시 해당 템플릿의 detail을 조회하여 `TemplateFormModal`을 생성 모드로 프리필하여 연다. 즉시 저장하지 않음.
- **D-03:** 프리필 시 `name`에 `" (복사본)"` suffix 자동 추가, `prefix`는 비워 둠(사용자가 새 prefix 필수 입력). description/category/icon/schemaDefinition은 그대로 복사.
- **D-04:** 복제 플로우와 Import 플로우는 "TemplateFormModal 생성 모드 + 프리필" 동일 패턴 공유.

**JSON Export & Import**
- **D-05:** Export JSON 포맷 — `{ exportFormatVersion: 1, schemaVersion, name, description, prefix, category, icon, schemaDefinition }`. `code`, `id`, `createdBy`, `createdAt`, `isActive` 제외.
- **D-06:** Export 파일명 규칙 — `{code}-{YYYYMMDD}.json`.
- **D-07:** Export는 전적으로 프론트엔드 — `GET /admin/templates/{id}` → 직렬화 → Blob download. 백엔드 변경 없음.
- **D-08:** Import용 전용 Zod 스키마 `templateImportSchema` 신규 작성. 위치: `frontend/src/features/admin/validations/templateImportSchema.ts`. SchemaDefinition 구조(fields/conditionalRules/calculationRules) 깊게 검증. 기존 `schemaToZod.ts`는 재사용하지 않음.
- **D-09:** Import 검증 실패 시 파일 선택 모달 내부에 상세 오류 리스트(Zod `.format()` 출력을 필드 경로별로 렌더링). toast는 상단 알림 용도로만.
- **D-10:** Import 검증 통과 시 `TemplateFormModal`을 생성 모드로 프리필하여 열고, `prefix`는 비워서 사용자가 입력하게 함(D-03과 동일 패턴).
- **D-11:** prefix 충돌은 모달 저장 시 백엔드 409를 받아 인라인 에러로 처리. 기존 메시지 "이미 사용 중인 접두사입니다"를 그대로 노출 (`TemplateService.java:170-172`).

**프리셋 템플릿**
- **D-12:** 프리셋 JSON은 프론트엔드 assets에 둠. 위치: `frontend/src/features/admin/presets/*.json`.
- **D-13:** 초기 프리셋 4종 — 경비신청서, 휴가신청서, 출장신청서, 구매신청서. 각 프리셋은 Phase 22~25 기능(분할 레이아웃, 테이블 컬럼, 조건부 규칙, 계산 규칙)을 활용.
- **D-14:** 프리셋 JSON 포맷은 Export JSON 포맷(D-05)과 동일 — 같은 `templateImportSchema`로 검증 가능.
- **D-15:** 프리셋 name/description/category/icon은 i18n 키가 아닌 한국어 기본값으로 고정. i18n은 "프리셋 메뉴 라벨"에만 적용.

**프리셋/Import 진입 UI**
- **D-16:** `TemplateListPage`의 "양식 추가" 버튼 → 선택 모달 3옵션: (1) 빈 양식 (2) 프리셋 (3) JSON 가져오기.
- **D-17:** 각 옵션은 최종적으로 동일한 `TemplateFormModal`을 생성 모드로 열되, 각각 다른 초기값 프리필.

**백엔드 API 전략**
- **D-18:** 백엔드 신규 엔드포인트 추가 없음. 복제/Export/Import/프리셋 모두 기존 API 재사용.
- **D-19:** `code` 필드 고유성은 백엔드가 `CUSTOM_<nanoid>`로 생성. 프론트는 code 전송 안 함.

**코드 구조**
- **D-20:** 신규 컴포넌트 위치 — `TemplateCreateChoiceModal.tsx`, `PresetGallery.tsx`, `ImportTemplateModal.tsx`, `validations/templateImportSchema.ts`, `utils/templateExport.ts`, `presets/*.json`.
- **D-21:** `TemplateFormModal`은 `initialValues?: Partial<CreateTemplateData>` prop 추가. 기존 create/edit 모드 로직과 호환.

### Claude's Discretion
- 아이콘 선택 (Copy, Download, Upload, LayoutTemplate 등 lucide 아이콘)
- 프리셋 JSON 파일별 구체적 필드 구성
- 선택 모달의 구체적 레이아웃 (3카드 그리드 vs 세로 리스트)
- i18n 키 이름과 영어 번역
- Import 오류 메시지 한국어 문구

### Deferred Ideas (OUT OF SCOPE)
- 양식 버전 관리 / 이력 복원
- 프리셋 마켓플레이스 / 사용자 업로드 공유
- 백엔드 프리셋 seed
- Bulk export (전체 템플릿 ZIP)
- 양식 vs 양식 diff 기능
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CNV-01 | 관리자가 기존 양식을 복제하여 새 양식 생성 | `TemplateTable` 행 Copy 버튼 → `useTemplateDetail(id)`로 schemaDefinition 조회 → `TemplateFormModal`을 `initialValues`와 함께 생성 모드로 오픈. `POST /admin/templates`로 저장. |
| CNV-02 | 양식 스키마를 JSON 파일로 내보내기 | 프론트엔드 전용: `templateApi.getDetail(id)` → `utils/templateExport.ts`에서 D-05 포맷으로 직렬화 → `Blob` + `URL.createObjectURL` + `<a download>` 트릭. `TemplateTable` Download 아이콘에서 호출. |
| CNV-03 | JSON 업로드 → Zod 검증 → 양식 생성 | `ImportTemplateModal` — `<input type="file" accept=".json">` → `FileReader.readAsText` → `JSON.parse` → `templateImportSchema.safeParse` → 실패 시 `.error.format()` 트리 렌더링 / 성공 시 `TemplateFormModal` 프리필 오픈. |
| CNV-04 | 프리셋 템플릿에서 빠르게 생성 | `frontend/src/features/admin/presets/*.json`을 Vite의 정적 import로 번들에 포함 → `PresetGallery`에서 4개 카드 렌더 → 선택 시 `TemplateFormModal` 프리필 오픈. 프리셋도 `templateImportSchema`로 **dev-time 검증**(CI 또는 Vitest). |
</phase_requirements>

## Standard Stack

이 Phase는 **새 라이브러리를 도입하지 않습니다.** 필요한 모든 기능이 이미 설치되어 있음을 확인했습니다.

### Core (already installed — verified in TemplateFormModal.tsx)
| Library | Purpose | 재사용 지점 |
|---------|---------|-------------|
| `react-hook-form` | 모달 폼 상태 관리 | TemplateFormModal의 `useForm` 그대로 사용 [VERIFIED: TemplateFormModal.tsx:2] |
| `@hookform/resolvers/zod` | Zod ↔ RHF 연결 | 이미 `zodResolver` 사용 중 [VERIFIED: TemplateFormModal.tsx:3] |
| `zod` | 스키마 검증 | 신규 `templateImportSchema` 작성용 [VERIFIED: TemplateFormModal.tsx:4] |
| `sonner` | 토스트 알림 | `toast.success` / `toast.error` [VERIFIED: TemplateFormModal.tsx:8] |
| `lucide-react` | 아이콘 | Copy, Download, Upload, LayoutTemplate, FileJson 추가 [VERIFIED: TemplateFormModal.tsx:5] |
| `react-i18next` | i18n | `admin` 네임스페이스 사용 [VERIFIED: TemplateFormModal.tsx:6] |
| `@tanstack/react-query` | 서버 상태 | `useCreateTemplate`, `useTemplateDetail` 재사용 [VERIFIED: useTemplates.ts] |
| `axios` | HTTP | `AxiosError` 타입 처리 [VERIFIED: TemplateFormModal.tsx:7] |

### Vite 기능 (설치 불필요)
- **JSON 정적 import**: Vite는 `import preset from './presets/expense.json'`을 기본 지원. 타입 안전성을 위해 `import preset from './presets/expense.json' with { type: 'json' }` 또는 `tsconfig.json`의 `resolveJsonModule: true` 확인 필요.
- **Blob download**: 브라우저 네이티브 API만 사용. `new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })` + `URL.createObjectURL` + 임시 `<a>` 요소 클릭 패턴.
- **File input**: 네이티브 `<input type="file">` + `FileReader.readAsText`. 드래그앤드롭이 필요하면 추후 phase.

### Alternatives Considered
| 대안 | 결정 | 근거 |
|------|------|------|
| `file-saver` 라이브러리 | 사용 안 함 | 단일 JSON 한 건 다운로드에 의존성 추가 과잉. 네이티브 Blob API로 충분. |
| 드래그앤드롭 업로드 | 이번 Phase 제외 | CNV-03 criteria는 "업로드" 만 요구. `<input type="file">`으로 충족. 필요 시 후속 phase. |
| 백엔드 `POST /admin/templates/{id}/duplicate` 엔드포인트 | 사용 안 함 (D-18) | 복제도 "사용자가 이름/prefix 수정 후 저장" 흐름이므로 전용 엔드포인트보다 기존 create API 재사용이 Import/프리셋과 UX 통일 가능. |
| 백엔드 프리셋 seed (DB 테이블) | 사용 안 함 (D-12) | 프리셋은 관리자 '제안'일 뿐이므로 프론트 assets가 배포·타입안전·i18n 면에서 단순. |
| `zod` 대신 `ajv` | 사용 안 함 | 프로젝트 전역이 이미 Zod. [VERIFIED: TemplateFormModal.tsx:4] |

**Installation:** None. 모든 의존성이 이미 설치되어 있음.

## Architecture Patterns

### 새 파일 구조 (D-20 기준)

```
frontend/src/features/admin/
├── components/
│   ├── TemplateCreateChoiceModal.tsx  [NEW] 양식 추가 → 3옵션 선택 모달
│   ├── PresetGallery.tsx              [NEW] 프리셋 4개 카드 갤러리
│   ├── ImportTemplateModal.tsx        [NEW] JSON 파일 선택 + 검증 결과
│   ├── TemplateFormModal.tsx          [MODIFY] initialValues prop 추가 + prefill 경로
│   └── TemplateTable.tsx              [MODIFY] Copy/Download 아이콘 버튼 추가
├── pages/
│   └── TemplateListPage.tsx           [MODIFY] ChoiceModal 상태 추가
├── validations/
│   └── templateImportSchema.ts        [NEW] Zod로 SchemaDefinition 전체 검증
├── utils/
│   └── templateExport.ts              [NEW] 직렬화 + Blob download + 파일명 생성
└── presets/
    ├── expense.json                   [NEW] 경비신청서
    ├── leave.json                     [NEW] 휴가신청서
    ├── trip.json                      [NEW] 출장신청서
    └── purchase.json                  [NEW] 구매신청서
```

### Pattern 1: 단일 Zod 스키마 = 3개 진입점의 진실의 원천

`templateImportSchema`는 **Export JSON / Import JSON / 프리셋 JSON** 세 경로 모두에게 단일 검증기입니다. 이렇게 하면:
- 개발자가 프리셋 JSON을 잘못 작성하면 **번들 타임/테스트 타임**에 잡을 수 있음 (Vitest 1개로 4개 프리셋 검증).
- Import 경로의 버그 수정이 자동으로 프리셋 경로에도 적용됨.
- Export에서 쓴 포맷이 Import에서 반드시 역직렬화 가능함을 보장.

```typescript
// frontend/src/features/admin/validations/templateImportSchema.ts
// Source: derived from frontend/src/features/document/types/dynamicForm.ts:1-71
import { z } from 'zod';

const fieldTypeSchema = z.enum([
  'text', 'textarea', 'number', 'date', 'select', 'table', 'staticText', 'hidden'
]);

const optionItemSchema = z.object({
  value: z.string(),
  label: z.string(),
  sortOrder: z.number().optional(),
});

const columnSchema = z.object({
  id: z.string().min(1),
  type: fieldTypeSchema,
  label: z.string().min(1),
  required: z.boolean().optional(),
  config: z.any().optional(), // recursive — loosened intentionally
});

const fieldConfigSchema = z.object({
  placeholder: z.string().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
  options: z.array(optionItemSchema).optional(),
  content: z.string().optional(),
  defaultValue: z.string().optional(),
  minRows: z.number().optional(),
  maxRows: z.number().optional(),
  columns: z.array(columnSchema).optional(),
}).passthrough();

const fieldDefinitionSchema = z.object({
  id: z.string().min(1),
  type: fieldTypeSchema,
  label: z.string().min(1),
  required: z.boolean(),
  config: fieldConfigSchema.optional(),
});

const conditionalRuleSchema = z.object({
  targetFieldId: z.string().min(1),
  condition: z.object({
    fieldId: z.string().min(1),
    operator: z.string().min(1),
    value: z.unknown(),
  }),
  action: z.enum(['show', 'hide', 'require', 'unrequire']),
});

const calculationRuleSchema = z.object({
  targetFieldId: z.string().min(1),
  formula: z.string().min(1),
  dependsOn: z.array(z.string()),
});

const schemaDefinitionSchema = z.object({
  version: z.number().int().positive(),
  fields: z.array(fieldDefinitionSchema),
  conditionalRules: z.array(conditionalRuleSchema).optional(),
  calculationRules: z.array(calculationRuleSchema).optional(),
});

export const templateImportSchema = z.object({
  exportFormatVersion: z.literal(1),
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  prefix: z.string().min(1).max(10),  // 검증용 — 실제 사용 시 비워짐 (D-10)
  category: z.string().max(50).optional(),
  icon: z.string().max(50).optional(),
  schemaDefinition: schemaDefinitionSchema,
});

export type TemplateImportData = z.infer<typeof templateImportSchema>;
```

**주의:** `version`(내부 schemaDefinition)과 `schemaVersion`(템플릿 레벨)을 구분해야 합니다. 기존 `TemplateFormModal.tsx:174-179`에서 `{ version: 1, fields, conditionalRules, calculationRules }`로 저장하고 있으므로 내부 version은 `SchemaDefinition.version` [VERIFIED: dynamicForm.ts:66], 외부 `schemaVersion`은 `TemplateDetailItem.schemaVersion` [VERIFIED: templateApi.ts:29] 필드입니다.

### Pattern 2: TemplateFormModal의 `initialValues` prop 확장

현재 `TemplateFormModal`은 `editingTemplate` prop 하나로 create/edit를 구분합니다:
- `editingTemplate === null` → 생성 모드, `reset({ name: '', ... })` + 빈 schemaFields
- `editingTemplate !== null` → 편집 모드, DB에서 detail 조회 후 reset

**D-21 확장 방식:**
```typescript
interface TemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  editingTemplate: TemplateListItem | null;
  initialValues?: {  // [NEW] 생성 모드 프리필용
    name?: string;
    description?: string;
    prefix?: string;
    category?: string;
    icon?: string;
    schemaFields?: SchemaField[];
    conditionalRules?: ConditionalRule[];
    calculationRules?: CalculationRule[];
  } | null;
  onSuccess?: () => void;
}
```

생성 모드(`editingTemplate === null`) 일 때 useEffect 초기화 로직을 다음과 같이 변경:
```typescript
// TemplateFormModal.tsx:72-90 수정 대상
if (open) {
  if (editingTemplate) {
    // 기존 편집 모드 로직 유지
  } else {
    // 생성 모드: initialValues 있으면 프리필, 없으면 빈 값
    reset({
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      prefix: initialValues?.prefix ?? '',  // D-03/D-10: 복제/Import 시 비어 있어야 함
      category: initialValues?.category ?? '',
      icon: initialValues?.icon ?? '',
    });
    setSchemaFields(initialValues?.schemaFields ?? []);
    setConditionalRules(initialValues?.conditionalRules ?? []);
    setCalculationRules(initialValues?.calculationRules ?? []);
  }
  setActiveTab('info');
}
```

**중요 회귀 위험:** 현재 편집 모드 schemaFields는 `detailQuery` useEffect(96-110행)에서 로드됩니다. 생성 모드 + initialValues 경로가 이 detailQuery useEffect와 충돌하지 않도록 편집 모드 분기를 명확히 유지해야 합니다(이미 `if (!open || !editingTemplate) return;`로 가드 중이라 안전 [VERIFIED: TemplateFormModal.tsx:94]).

### Pattern 3: Blob Download (네이티브 브라우저 API)

```typescript
// frontend/src/features/admin/utils/templateExport.ts
// Source: MDN https://developer.mozilla.org/en-US/docs/Web/API/Blob
import type { TemplateDetailItem } from '../api/templateApi';

export function buildExportPayload(detail: TemplateDetailItem) {
  return {
    exportFormatVersion: 1 as const,
    schemaVersion: detail.schemaVersion,
    name: detail.name,
    description: detail.description || undefined,
    prefix: detail.prefix,
    category: detail.category || undefined,
    icon: detail.icon || undefined,
    schemaDefinition: detail.schemaDefinition
      ? JSON.parse(detail.schemaDefinition)
      : { version: 1, fields: [] },
  };
}

export function buildExportFilename(code: string, date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${code}-${yyyy}${mm}${dd}.json`;
}

export function downloadTemplateJson(detail: TemplateDetailItem): void {
  const payload = buildExportPayload(detail);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = buildExportFilename(detail.code);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // 메모리 누수 방지: 다음 tick에 revoke
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
```

### Pattern 4: Zod `.format()` 에러 트리 렌더링

Import 모달에서 검증 실패 시 필드 경로별로 에러를 보여주는 패턴. Zod의 `.error.format()`은 중첩 객체를 반환하므로 재귀 렌더링 혹은 flatten이 필요합니다.

```typescript
// Pattern used in ImportTemplateModal.tsx
import type { ZodError } from 'zod';

interface FlatError { path: string; message: string; }

function flattenZodErrors(error: ZodError): FlatError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    message: issue.message,
  }));
}

// UI:
// <ul> {errors.map(e => <li key={e.path}><code>{e.path}</code>: {e.message}</li>)} </ul>
```

`.issues` 배열을 직접 사용하는 것이 `.format()` 트리보다 렌더링이 단순합니다 — D-09는 "필드 경로별 리스트"를 요구하므로 flatten이 더 적합합니다.

### Pattern 5: 3개 진입점 → 1개 TemplateFormModal 상태 조립 (D-17)

`TemplateListPage`에 상태 머신 추가:
```typescript
type CreateFlow =
  | { kind: 'closed' }
  | { kind: 'choice' }                              // 선택 모달 열림
  | { kind: 'presetGallery' }                       // 프리셋 카드 갤러리
  | { kind: 'import' }                              // Import 모달
  | { kind: 'form'; initialValues: InitialValues };  // TemplateFormModal (생성) 열림
```

선택 모달 → 옵션 클릭 → 다음 단계 모달/갤러리 → 선택 완료 → `{ kind: 'form', initialValues }`로 전이 → `TemplateFormModal` 오픈. 편집 경로(`editingTemplate`)는 기존 state 유지.

### Anti-Patterns to Avoid
- **`schemaToZod.ts` 재사용 금지:** 이 유틸은 "스키마 → 최종 사용자 폼 값 검증기"입니다. Import는 "스키마 자체의 구조 검증"이므로 용도가 다름 (D-08).
- **프리셋을 DB 시드로 넣기:** D-12에 의해 명시적 금지. 프론트 assets가 배포·타입안전·i18n 측면에서 단순.
- **Export에 `code`/`id` 포함:** D-05에 의해 금지. 백엔드가 항상 `CUSTOM_<nanoid>`를 새로 생성하므로 export된 code는 불변이 아님.
- **복제 시 즉시 저장:** D-02 금지. 사용자가 prefix를 반드시 수정해야 하므로 모달을 반드시 거침.
- **`URL.createObjectURL` revoke 누락:** 메모리 누수. `setTimeout(revoke, 0)` 패턴 권장.

## Don't Hand-Roll

| 문제 | 직접 구현하지 말 것 | 대신 사용 | 이유 |
|------|---------------------|-----------|------|
| JSON 구조 검증 | 수작업 if/typeof 체크 | `templateImportSchema` (Zod) | Zod는 에러 메시지·경로·타입 추론 모두 제공 |
| 폼 상태 | `useState` 조합 | 기존 `useForm` (RHF) | TemplateFormModal과 일관성 |
| 서버 뮤테이션 | `fetch` 직접 호출 | `useCreateTemplate` 훅 | 캐시 무효화·에러 전파 자동 |
| 파일 다운로드 | 외부 라이브러리 (`file-saver`) | Blob + `URL.createObjectURL` | 네이티브만으로 충분 |
| 에러 토스트 | 자체 구현 | `sonner` `toast.error` | 프로젝트 전역 패턴 |
| 확인 다이얼로그 | 새 컴포넌트 | `ConfirmDialog` | 이미 존재하는 base 컴포넌트 [VERIFIED: TemplateTable.tsx:6] |

**Key insight:** Phase 26은 **새 기능의 80%가 기존 블록의 재배치**입니다. 새 코드는 (1) 3개 얇은 래퍼 모달, (2) 1개 Zod 스키마, (3) 1개 유틸, (4) 4개 프리셋 JSON뿐입니다.

## Runtime State Inventory

> Phase 26은 rename/refactor가 아닌 **기능 추가** phase이므로 이 섹션은 최소 형태로만 포함합니다.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — 신규 DB 레코드 작성만 (기존 `POST /admin/templates` 경로) | 데이터 마이그레이션 불필요 |
| Live service config | None | 없음 |
| OS-registered state | None | 없음 |
| Secrets/env vars | None | 없음 |
| Build artifacts | 신규 프리셋 JSON 4개가 Vite 번들에 포함됨 — 빌드 산출물 크기가 약간 증가 | `npm run build`로 번들 확인 |

## Common Pitfalls

### Pitfall 1: Export 포맷과 내부 `SchemaDefinition.version`의 이중 의미
**무엇이 잘못되는가:** CONTEXT.md D-05는 `schemaVersion`을 export payload의 top-level 필드로 두지만, `TemplateFormModal.tsx:174-179`가 `schemaDefinition` 내부에 `{ version: 1, ... }`을 저장합니다. 두 숫자가 서로 다른 의미(`schemaVersion`은 템플릿 레벨 — 편집 시마다 +1, `version`은 SchemaDefinition 스키마 포맷 버전 — 현재 항상 1).
**왜 발생하는가:** 기존 코드가 두 버전 개념을 혼용.
**피하는 법:** `templateImportSchema`에서 `exportFormatVersion`(파일 포맷), `schemaVersion`(템플릿 레코드 버전), `schemaDefinition.version`(내부 구조 포맷) **세 가지를 모두 명시적으로** 구분하여 검증. 문서화 주석 필수.
**조기 감지:** 프리셋 JSON 4개를 Vitest로 `templateImportSchema.parse()` 통과시키는 테스트 — 포맷 혼동 시 바로 실패.

### Pitfall 2: 복제/Import 시 schemaFields가 `TemplateFormModal` 편집 모드 useEffect와 충돌
**무엇이 잘못되는가:** 현재 `detailQuery` useEffect(96-110행)가 `editingTemplate`이 있을 때만 schemaFields를 로드합니다. 생성 모드 + initialValues를 넣을 때 이 useEffect가 재실행되지 않아야 정상. `editingTemplate === null`이므로 early return으로 안전하지만, 두 useEffect의 실행 순서를 잘못 관리하면 `initialValues`의 schemaFields가 빈 배열로 덮어써질 수 있음.
**피하는 법:** 단일 useEffect로 통합하거나, 생성 모드 초기화 useEffect에서 `editingTemplate`을 의존성에 포함하여 `editingTemplate`이 null인 경우에만 `initialValues`를 사용.
**조기 감지:** 복제 시 schemaFields 탭에 필드가 나타나는지 수동 확인.

### Pitfall 3: Import 검증 통과 후 사용자가 JSON을 "신뢰"해버리는 UX 함정
**무엇이 잘못되는가:** JSON 검증은 구조(shape)만 보장합니다. 예를 들어 `conditionalRules[].condition.fieldId`가 `fields` 목록에 실제로 존재하는지, `calculationRules`의 순환 의존성 같은 **교차 참조 무결성**은 Zod만으로 안 잡힙니다.
**피하는 법:** 이미 `TemplateFormModal.onSubmit`(138-172행)에 table 컬럼 / 조건 규칙 필드 존재성 / 계산 규칙 순환 검증이 있음 [VERIFIED]. 그 검증이 저장 직전에 다시 돌기 때문에 **Import → 모달 프리필 → 저장** 경로는 안전. 단, 모달에 띄우기 전에 교차 참조가 깨진 프리셋/Import는 "저장 불가" 상태로 열림 — 사용자가 혼란스러울 수 있으므로, Import 성공 직후 `detectCircularDeps` + 필드 ID 참조 확인을 한 번 추가로 돌려 미리 경고하는 것을 권장.
**조기 감지:** 일부러 깨진 JSON 파일로 Import → 모달이 열리지만 저장 버튼 disabled 상태인지 확인.

### Pitfall 4: prefix 충돌 시 409 에러 메시지 경로
**무엇이 잘못되는가:** 백엔드 `TemplateService.java:170-172`는 `BusinessException("TPL_PREFIX_DUPLICATE", "이미 사용 중인 접두사입니다: " + request.prefix())`를 던집니다. 현재 `TemplateFormModal`은 `errorCode`를 `t('errors.TPL_PREFIX_DUPLICATE')`로 매핑하고, 없으면 `errorMessage`를 그대로 노출합니다 [VERIFIED: TemplateFormModal.tsx:209-217]. 복제/Import/프리셋 모두 이 기존 경로를 재사용하므로 추가 작업 불필요.
**피하는 법:** 신규 i18n 키 `errors.TPL_PREFIX_DUPLICATE`가 `admin.json`에 존재하는지만 확인하면 됨.
**조기 감지:** 동일 prefix로 저장 시도 → name 필드 아래 빨간 에러 메시지 확인.

### Pitfall 5: Export 파일명에 포함되는 `code`가 한국어/특수문자일 가능성
**무엇이 잘못되는가:** 백엔드가 `CUSTOM_<nanoid>` 형식으로만 생성하므로 이론상 ASCII 안전하지만, 시드 기본 템플릿(`GENERAL`, `EXPENSE`, `LEAVE` 등)은 다른 규칙을 쓸 수 있음.
**피하는 법:** `buildExportFilename`에서 `code`를 그대로 쓰되, 안전을 위해 `code.replace(/[^a-zA-Z0-9_-]/g, '_')` 필터 한 줄 추가.

### Pitfall 6: 프리셋 JSON을 Vite가 번들에 포함하는 방식
**무엇이 잘못되는가:** `import preset from './presets/expense.json'`은 타입 안전하지만, 4개를 손으로 import하면 동적 추가가 어렵습니다.
**피하는 법:** Vite의 `import.meta.glob('./presets/*.json', { eager: true })`를 사용하여 모든 프리셋을 자동 로드. TypeScript 타입은 `as TemplateImportData` 단언 후 Zod 재검증.
**조기 감지:** Vitest로 모든 프리셋이 `templateImportSchema.parse()`를 통과하는지 확인.

## Code Examples

### Example 1: Duplicate button handler (TemplateTable → TemplateListPage 통신)

```typescript
// TemplateTable.tsx — 새 prop 추가
interface TemplateTableProps {
  templates: TemplateListItem[];
  isLoading: boolean;
  onEdit?: (template: TemplateListItem) => void;
  onDuplicate?: (template: TemplateListItem) => void;  // [NEW]
  onExport?: (template: TemplateListItem) => void;     // [NEW]
}

// 행 액션 셀 (현재 156-164행 영역)
<td className="px-4 py-3">
  <div className="flex items-center gap-1">
    <button type="button" onClick={() => onEdit?.(template)} aria-label={...}>
      <Pencil className="w-4 h-4" />
    </button>
    <button type="button" onClick={() => onDuplicate?.(template)} aria-label={...}>
      <Copy className="w-4 h-4" />
    </button>
    <button type="button" onClick={() => onExport?.(template)} aria-label={...}>
      <Download className="w-4 h-4" />
    </button>
  </div>
</td>
```

### Example 2: TemplateListPage state machine

```typescript
// TemplateListPage.tsx
const [createFlow, setCreateFlow] = useState<CreateFlow>({ kind: 'closed' });
const [editingTemplate, setEditingTemplate] = useState<TemplateListItem | null>(null);

const handleDuplicate = async (tpl: TemplateListItem) => {
  const detail = await templateApi.getDetail(tpl.id).then(r => r.data.data!);
  const schema = detail.schemaDefinition ? JSON.parse(detail.schemaDefinition) : { fields: [] };
  setCreateFlow({
    kind: 'form',
    initialValues: {
      name: `${detail.name} (복사본)`,
      description: detail.description || '',
      prefix: '',  // D-03: 반드시 비워둠
      category: detail.category || '',
      icon: detail.icon || '',
      schemaFields: schema.fields ?? [],
      conditionalRules: schema.conditionalRules ?? [],
      calculationRules: schema.calculationRules ?? [],
    },
  });
};
```

### Example 3: Import 파일 읽기 + 검증

```typescript
// ImportTemplateModal.tsx
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const result = templateImportSchema.safeParse(json);
    if (!result.success) {
      setErrors(flattenZodErrors(result.error));
      return;
    }
    // D-10: 프리필 오픈
    onImportSuccess({
      name: result.data.name,
      description: result.data.description,
      prefix: '',  // 사용자가 새로 입력해야 함
      category: result.data.category,
      icon: result.data.icon,
      schemaFields: result.data.schemaDefinition.fields,
      conditionalRules: result.data.schemaDefinition.conditionalRules,
      calculationRules: result.data.schemaDefinition.calculationRules,
    });
  } catch (err) {
    toast.error(t('templates.import.parseError'));
  }
};
```

### Example 4: 프리셋 eager glob

```typescript
// frontend/src/features/admin/presets/index.ts
import { templateImportSchema, type TemplateImportData } from '../validations/templateImportSchema';

const modules = import.meta.glob<{ default: unknown }>('./*.json', { eager: true });

export interface Preset {
  key: string;               // 파일명 (expense, leave, trip, purchase)
  data: TemplateImportData;
}

export const presets: Preset[] = Object.entries(modules).map(([path, mod]) => {
  const key = path.replace(/^\.\/(.*)\.json$/, '$1');
  const parsed = templateImportSchema.parse(mod.default);  // 런타임 검증
  return { key, data: parsed };
});
```

### Example 5: 선택 모달 레이아웃 (D-16)

```typescript
// TemplateCreateChoiceModal.tsx (3카드 그리드)
<div className="grid grid-cols-3 gap-4 p-6">
  <button onClick={onBlank} className="p-6 border rounded-lg hover:bg-gray-50">
    <Plus className="w-8 h-8 mx-auto mb-2" />
    <div>{t('templates.create.blank')}</div>
  </button>
  <button onClick={onPreset} className="p-6 border rounded-lg hover:bg-gray-50">
    <LayoutTemplate className="w-8 h-8 mx-auto mb-2" />
    <div>{t('templates.create.preset')}</div>
  </button>
  <button onClick={onImport} className="p-6 border rounded-lg hover:bg-gray-50">
    <Upload className="w-8 h-8 mx-auto mb-2" />
    <div>{t('templates.create.import')}</div>
  </button>
</div>
```

## State of the Art

이 phase의 모든 패턴은 **기존 프로젝트 내부 Phase 21~25에서 이미 확립된 컨벤션**을 그대로 따릅니다. 외부 state of the art 조사는 해당 없음 (프리셋/복제는 표준 CRUD 패턴).

| 과거 접근 | 현재 접근 | 영향 |
|----------|----------|------|
| `formik` + `yup` | `react-hook-form` + `zod` | 이미 프로젝트 전역 표준 |
| `file-saver` | native Blob API | 의존성 최소화 |
| 백엔드 bulk endpoint | 프론트 재조립 | 백엔드 변경 0 |

## Assumptions Log

이 리서치의 모든 주장은 CONTEXT.md 결정 또는 실제 코드 파일 읽기로 검증되었습니다. `[ASSUMED]` 태그된 항목 없음.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | — | — | — |

단, CONTEXT.md에 명시되지 않은 다음 항목은 **Claude's Discretion**으로 플래너가 결정해야 합니다 (리서치 권장사항 제공):
- 아이콘: `Copy`, `Download`, `Upload`, `LayoutTemplate`, `FileJson`, `Plus` 권장
- 선택 모달 레이아웃: 3카드 그리드 권장 (시각적 동등함)
- 프리셋 4종의 구체적 필드 구성: Phase 22~25 기능(분할 프리뷰, 테이블, 조건 규칙, 계산 규칙) 각각이 최소 1개 프리셋에 등장하도록 구성
- i18n 키: `templates.create.blank`, `templates.create.preset`, `templates.create.import`, `templates.duplicate`, `templates.export.button`, `templates.export.success`, `templates.import.title`, `templates.import.parseError`, `templates.import.validationError`, `templates.preset.expense.name`, `templates.preset.leave.name`, `templates.preset.trip.name`, `templates.preset.purchase.name` 권장

## Open Questions

1. **프리셋 `name` 중복 시 UX**
   - 알려진 것: 사용자가 "경비신청서" 프리셋을 두 번 선택하면 두 번째에서 prefix는 비어 있지만 name은 같음.
   - 불분명한 것: 저장 시 name 중복을 허용하는가? 백엔드가 name 유니크 제약을 두지 않음 (`TemplateService.createTemplate`은 prefix만 검증) [VERIFIED].
   - 권장: 허용. prefix가 유니크하므로 name 중복은 식별에 영향 없음. 다만 사용자가 name을 수정할 수 있도록 모달이 열린 채로 제공하는 기존 UX로 충분.

2. **Export 시 비활성(inactive) 템플릿도 허용하는가?**
   - 알려진 것: `GET /admin/templates/{id}`는 isActive 여부와 무관하게 detail을 반환 (현재 코드 확인 필요).
   - 불분명한 것: 비활성 템플릿 Export를 금지해야 할 비즈니스 이유가 있는가?
   - 권장: 허용 — 관리자가 과거 양식을 참고/복원하는 유스케이스를 막을 이유 없음. `TemplateTable`에 isActive와 무관하게 Download 버튼 노출.

3. **대용량 JSON Import의 업로드 크기 한계**
   - 알려진 것: Import는 클라이언트 파싱이므로 서버 업로드 크기는 무관.
   - 불분명한 것: 현실적 JSON 크기 상한(예: 1MB)을 front에서 가드할 것인가?
   - 권장: `FileReader` 전에 `file.size > 1_000_000` 체크하고 에러 토스트. 100+ 필드 + 복잡한 규칙 양식도 수십 KB를 넘지 않으므로 1MB는 충분히 여유.

## Environment Availability

**이 phase는 외부 도구/서비스 의존성이 없습니다** — 순수 프론트엔드 기능 추가입니다.

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node/npm | 빌드 | ✓ | (기존 프로젝트) | — |
| Vite | JSON import, 번들 | ✓ | 5.x (기존) | — |
| 브라우저 Blob API | Export 다운로드 | ✓ | 모든 모던 브라우저 | — |
| 브라우저 FileReader API | Import 업로드 | ✓ | 모든 모던 브라우저 | — |

**Missing dependencies with no fallback:** 없음
**Missing dependencies with fallback:** 없음

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (프로젝트 기본, Phase 22~25에서 사용된 패턴 가정) |
| Config file | `frontend/vite.config.ts` / `frontend/vitest.config.ts` (있을 경우) |
| Quick run command | `cd frontend && npm run test -- --run <file>` |
| Full suite command | `cd frontend && npm run test -- --run` |

> Note: 기존 phases에서 정확히 어떤 테스트 커맨드를 썼는지는 플래너가 `package.json` 스크립트를 확인해 확정해야 합니다. Phase 25 계산 규칙 테스트의 기존 패턴을 참고.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CNV-01 | 복제 버튼 클릭 시 모달이 프리필 상태로 열림 | unit (component) | `npm run test -- --run TemplateTable.duplicate.test` | ❌ Wave 0 |
| CNV-01 | prefix 필드가 비어 있고 name에 "(복사본)" suffix | unit | 위 동일 | ❌ Wave 0 |
| CNV-02 | `buildExportPayload`가 `code`/`id`를 제외 | unit (pure) | `npm run test -- --run templateExport.test` | ❌ Wave 0 |
| CNV-02 | `buildExportFilename`이 `{code}-{YYYYMMDD}.json` 반환 | unit (pure) | 위 동일 | ❌ Wave 0 |
| CNV-03 | `templateImportSchema`가 유효한 JSON 통과 | unit | `npm run test -- --run templateImportSchema.test` | ❌ Wave 0 |
| CNV-03 | `templateImportSchema`가 잘못된 JSON 거절 + 에러 경로 | unit | 위 동일 | ❌ Wave 0 |
| CNV-03 | Import 모달이 검증 실패 에러 리스트 렌더링 | unit (component) | `npm run test -- --run ImportTemplateModal.test` | ❌ Wave 0 |
| CNV-04 | 4개 프리셋 JSON 모두 `templateImportSchema` 통과 | unit | `npm run test -- --run presets.test` | ❌ Wave 0 |
| 통합 | 각 경로가 모달 → 저장 → `POST /admin/templates` 호출 | manual UAT | 수동 | — |

### Sampling Rate
- **Per task commit:** `cd frontend && npm run test -- --run` (관련 파일만)
- **Per wave merge:** `cd frontend && npm run test -- --run && npm run build`
- **Phase gate:** 전체 테스트 그린 + 수동 UAT 체크리스트 완료 후 `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/features/admin/validations/templateImportSchema.test.ts` — CNV-03 검증
- [ ] `frontend/src/features/admin/utils/templateExport.test.ts` — CNV-02 순수 함수 검증
- [ ] `frontend/src/features/admin/presets/presets.test.ts` — CNV-04 프리셋 구조 검증 (모든 `*.json`이 스키마 통과)
- [ ] `frontend/src/features/admin/components/TemplateTable.duplicate.test.tsx` — CNV-01 UI 테스트
- [ ] `frontend/src/features/admin/components/ImportTemplateModal.test.tsx` — CNV-03 UI 테스트
- [ ] Vitest 프레임워크 설치/설정 확인 — 없다면 Wave 0에서 추가

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | 기존 JWT 미들웨어 — admin 엔드포인트만 호출되므로 `@PreAuthorize("hasRole('ADMIN')")` 그대로 유지 |
| V3 Session Management | no | 세션 관련 변경 없음 |
| V4 Access Control | yes | `POST /admin/templates`는 이미 SUPER_ADMIN/ADMIN만 접근. 복제/Import/프리셋 모두 같은 엔드포인트라 추가 변경 없음 |
| V5 Input Validation | **yes** | `templateImportSchema` (Zod)로 **클라이언트 측** 검증 + 백엔드 `CreateTemplateRequest` (Bean Validation)로 서버 측 검증. 둘 다 필요. |
| V6 Cryptography | no | 암호화 관련 로직 없음 |
| V8 Data Protection | yes (경미) | Export JSON은 민감정보가 아닌 양식 구조만 포함 — 승인 문서 데이터(`document_content`)는 포함되지 않음 |
| V12 File Upload | **yes** | Import의 `<input type="file">` — 클라이언트 측 파일 크기 제한, JSON 파싱만 수행, 서버로 파일 자체를 업로드하지 않음(클라이언트에서 JSON 파싱 후 구조화된 객체로 `POST /admin/templates` 호출) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 악성 JSON의 prototype pollution (`__proto__`) | Tampering | `JSON.parse`는 기본적으로 안전. Zod는 `__proto__`/`constructor` 키를 명시하지 않는 한 거부. `.passthrough()`를 사용한 `fieldConfigSchema`에 `.strict()` 고려 |
| 매우 큰 JSON으로 브라우저 DoS | Denial of Service | Import 전 `file.size > 1_000_000` 가드 |
| Import된 `schemaDefinition`이 기존 렌더러에서 크래시 유발 | Tampering | Zod 검증 + 모달 저장 시점의 기존 table/conditional/calculation 검증이 2차 방어선 [VERIFIED: TemplateFormModal.tsx:138-172] |
| Export 파일명 path traversal (`../`) | Tampering | `buildExportFilename`에서 `code`를 `[^a-zA-Z0-9_-]` 필터 |
| 악의적 관리자의 XSS 페이로드 삽입 (양식 label 등) | Tampering + XSS | 기존 React 렌더링은 기본 이스케이프. `dangerouslySetInnerHTML` 사용하지 않음 — 신규 컴포넌트도 동일 원칙 유지 |

### 권장 보안 체크
- [ ] `templateImportSchema`의 `fieldConfigSchema`에서 `.passthrough()` 대신 `.strict()` 사용 검토 (unknown 키 거부)
- [ ] Import 파일 크기 1MB 클라이언트 가드
- [ ] Export 파일명 sanitization (`code.replace(/[^a-zA-Z0-9_-]/g, '_')`)
- [ ] Import 모달이 에러 메시지를 `t()` 또는 텍스트 노드로만 렌더링 (HTML injection 방지)

## Project Constraints (from CLAUDE.md)

### 준수해야 할 CLAUDE.md 지시사항
- **한국어 응답 / UI 텍스트 한국어:** 모든 신규 i18n 키의 `ko.json` 값은 한국어 기본. 프리셋 기본 name/description도 한국어 (D-15).
- **기존 기능/메뉴/라우트 보존:** `TemplateListPage`의 기존 "양식 추가" 버튼은 사라지지 않고 동작만 **선택 모달 오픈**으로 변경. `TemplateFormModal` 편집 경로는 건드리지 않음. `TemplateTable`의 기존 edit/toggle 버튼은 그대로 유지.
- **Tech stack 일관성:** 새 라이브러리 도입 금지 — 기존 RHF/Zod/TanStack Query/sonner/lucide-react만 사용.
- **JWT stateless:** 변경 없음.
- **Form templates are hardcoded React components (PRD):** 이 Phase는 **CUSTOM(동적) 템플릿**에만 영향. GENERAL/EXPENSE/LEAVE 하드코딩 컴포넌트는 변경 없음. 복제/Export 시 동적 템플릿에만 의미 있음 — 기본 3종은 schemaDefinition이 null일 수 있으므로 `buildExportPayload`에서 방어.
- **GSD workflow:** 이 phase는 `/gsd:execute-phase`로 진행.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/26-convenience-features/26-CONTEXT.md` — 21개 잠긴 결정사항
- `.planning/REQUIREMENTS.md` — CNV-01~CNV-04 acceptance criteria
- `.planning/ROADMAP.md` — Phase 26 goal & success criteria
- `.planning/STATE.md` — v1.1 진행상황
- `frontend/src/features/admin/components/TemplateFormModal.tsx` — 481줄 전체 읽음, 확장 지점 식별
- `frontend/src/features/admin/components/TemplateTable.tsx` — 199줄 전체 읽음, Copy 버튼 삽입 지점
- `frontend/src/features/admin/pages/TemplateListPage.tsx` — 50줄 전체 읽음, state 머신 도입 지점
- `frontend/src/features/admin/api/templateApi.ts` — 75줄 전체, DTO 타입 확인
- `frontend/src/features/admin/hooks/useTemplates.ts` — 53줄 전체, mutation 훅 재사용 확인
- `frontend/src/features/document/types/dynamicForm.ts` — 71줄 전체, Zod 스키마 1:1 매핑 소스
- `backend/src/main/java/com/micesign/service/TemplateService.java:150-210` — createTemplate + prefix 검증 + code 생성
- `frontend/public/locales/ko/admin.json` (grep) — 기존 `templates.*` 키 네임스페이스 확인
- `CLAUDE.md` — 한국어 / 기존 기능 보존 요구

### Secondary (MEDIUM confidence)
- Vite `import.meta.glob` eager 문서 (공식 — 사용 경험 기반)
- MDN Blob / FileReader / URL.createObjectURL 문서 (네이티브 API, 표준)

### Tertiary (LOW confidence)
- 없음

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — 모든 라이브러리가 코드베이스에서 직접 확인됨
- Architecture: **HIGH** — 확장 지점 파일을 직접 읽고 검증함
- Pitfalls: **HIGH** — TemplateFormModal의 기존 검증 로직을 직접 읽어서 상호작용 확인
- Import Zod 스키마: **HIGH** — `SchemaDefinition` TypeScript 타입을 직접 읽고 1:1 매핑
- 테스트 프레임워크 세부: **MEDIUM** — `package.json` 미확인, Vitest라 가정. 플래너가 Wave 0에서 `frontend/package.json`의 `scripts.test`를 확인해 확정 필요

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30일 — 안정적 영역)

## RESEARCH COMPLETE

**Phase:** 26 - 편의 기능
**Confidence:** HIGH

### Key Findings
- CONTEXT.md의 모든 결정사항(D-01~D-21)은 실제 코드와 정합성 확인 완료 — 플래너는 결정을 그대로 따라 플랜 작성 가능.
- 백엔드 변경 0 — 전적으로 프론트엔드 phase. `POST /admin/templates`와 `GET /admin/templates/{id}` 두 엔드포인트만으로 4개 요구사항 모두 충족.
- 새 라이브러리 도입 0 — 기존 RHF/Zod/TanStack Query/sonner/lucide-react/Vite 기능만 사용.
- `TemplateFormModal`의 단일 breaking change: `initialValues?` prop 추가. 편집 경로는 무손실.
- `templateImportSchema` 하나가 Export/Import/프리셋 3개 경로의 진실의 원천이 되어 유지보수 단순화.
- 교차 참조 무결성(순환 의존성, 잘못된 fieldId 참조)은 이미 `TemplateFormModal.onSubmit`에서 검증되므로 Import 모달은 shape 검증만 집중하면 됨.

### File Created
`/Volumes/USB-SSD/03-code/VibeCoding/MiceSign/.planning/phases/26-convenience-features/26-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | 모든 라이브러리가 코드베이스에서 직접 확인됨 |
| Architecture | HIGH | 확장 지점 5개 파일을 전부 읽고 검증 |
| Pitfalls | HIGH | TemplateFormModal 기존 검증 로직과의 상호작용을 직접 확인 |
| Import Zod 스키마 | HIGH | dynamicForm.ts 타입을 1:1 매핑 |

### Open Questions
- 프리셋 name 중복 허용 여부 — 권장: 허용
- 비활성 템플릿 Export 허용 여부 — 권장: 허용
- JSON 업로드 크기 상한 — 권장: 1MB 클라이언트 가드
- Vitest 설정 상태 (frontend/package.json의 test script 확인 필요) — Wave 0에서 플래너 확인

### Ready for Planning
Research complete. Planner can now create PLAN.md files. 2개 플랜 권장 구성(ROADMAP 힌트):
- **26-01-PLAN.md:** 기반 모듈 — `templateImportSchema` + `templateExport` 유틸 + `TemplateFormModal.initialValues` prop 확장 + 4개 프리셋 JSON + Vitest 단위 테스트
- **26-02-PLAN.md:** UI 통합 — `TemplateCreateChoiceModal` + `PresetGallery` + `ImportTemplateModal` + `TemplateTable` Copy/Download 버튼 + `TemplateListPage` state 머신 + i18n 키 추가 + 수동 UAT
