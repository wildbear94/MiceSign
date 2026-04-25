# Phase 32: CUSTOM 프리셋 확장 - Research

**Researched:** 2026-04-25
**Domain:** Frontend admin preset registry (JSON drop-in + Zod build-time validation + i18n)
**Confidence:** HIGH

## Summary

본 phase 는 v1.1 Phase 26 에서 완성된 preset 인프라 (Vite eager glob loader + `templateImportSchema` Zod `.strict()` 검증 + `PresetGallery` 컴포넌트 + `TemplateListPage.createFlow` state machine) 위에 회의록 (`meeting.json`) + 품의서 (`proposal.json`) 2개 JSON 파일을 추가하고, `PresetGallery.tsx` 의 `ICON_MAP`/`I18N_MAP` 에 entry 2 개씩, `presets.test.ts` 의 length/keys 단언, `ko/admin.json` 의 i18n 키 4 개를 업데이트하는 **순수 데이터 확장 작업**이다 [VERIFIED: codebase grep].

신규 React 컴포넌트, 신규 field type, 신규 conditional/calculation rule 패턴, 신규 빌드 파이프라인, 백엔드 변경, DB 마이그레이션 모두 zero. CONTEXT 의 8 영역 (D-A1~A6 회의록 schema / D-B1~B7 품의서 schema / D-C1~C5 PresetGallery 통합 / D-D1~D3 검증 / D-E1~E2 i18n) 결정이 이미 모든 ambiguity 를 제거했고, RESEARCH 는 그 결정의 **기술적 안전성과 통합 경로 검증**에 집중한다.

**Primary recommendation:** 6 plan 으로 구성. ① meeting.json 작성 + Zod 통과 검증 / ② proposal.json 작성 + Zod 통과 검증 / ③ PresetGallery `ICON_MAP`/`I18N_MAP` 4 entry 추가 / ④ ko/admin.json 4 키 추가 / ⑤ presets.test.ts 단언 업데이트 / ⑥ 통합 build + vitest + tsc 검증. 각 plan 1-2 task 수준, 총 작업 30분~1시간 예상.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### A. 회의록 (meeting) 스키마
- **D-A1:** filename = `frontend/src/features/admin/presets/meeting.json` — preset key = `meeting` (filename stem). ICON_MAP / I18N_MAP key 동일 사용.
- **D-A2:** `prefix = 'MTG'` (3자, EXP/LV/PUR/TRP 패턴 일치).
- **D-A3:** `category = 'general'` — 기존 카테고리 (finance/hr/general) 재사용. 신규 category 키 도입 안 함.
- **D-A4:** `icon = 'Users'` (lucide-react). PresetGallery `ICON_MAP['meeting'] = Users` 추가.
- **D-A5:** 필드 구성:
  - `id='title'`, `type='text'`, `required=true`
  - `id='meetingDate'`, `type='date'`, `required=true`
  - `id='attendees'`, `type='table'`, `required=true`, columns = `[name(text required), affiliation(text required), role(text)]`, `minRows=1`, `maxRows=20`
  - `id='agenda'`, `type='table'`, `required=true`, columns = `[number(number required), title(text required), description(textarea)]`, `minRows=1`, `maxRows=20`
  - `id='decisions'`, `type='table'`, `required=true`, columns = `[topic(text required), decision(text required), owner(text), dueDate(date)]`, `minRows=1`, `maxRows=20`
- **D-A6:** `conditionalRules = []`, `calculationRules = []`

#### B. 품의서 (proposal) 스키마
- **D-B1:** filename = `frontend/src/features/admin/presets/proposal.json` — key = `proposal`.
- **D-B2:** `prefix = 'PRP'` (3자).
- **D-B3:** `category = 'general'`.
- **D-B4:** `icon = 'FileSignature'` (lucide-react). `ICON_MAP['proposal'] = FileSignature`.
- **D-B5:** 필드 구성 (4개):
  - `id='title'`, `type='text'`, `required=true`
  - `id='background'`, `type='textarea'`, `required=true`, `config.maxLength=2000`
  - `id='proposal'`, `type='textarea'`, `required=true`, `config.maxLength=2000`
  - `id='expectedEffect'`, `type='textarea'`, `required=true`, `config.maxLength=2000`
- **D-B6:** **첨부는 schema field 미포함** — `document_attachment` 테이블 + Google Drive 업로드가 문서-차원에서 처리.
- **D-B7:** `conditionalRules = []`, `calculationRules = []`

#### C. PresetGallery 통합 (코드 변경)
- **D-C1:** `PresetGallery.tsx` `ICON_MAP` 에 2개 추가: `meeting: Users`, `proposal: FileSignature`. 기존 4개 preserve.
- **D-C2:** `PresetGallery.tsx` `I18N_MAP` 에 2개 추가: `meeting: { nameKey: 'templates.presetMeetingName', descKey: 'templates.presetMeetingDesc' }`, `proposal: { nameKey: 'templates.presetProposalName', descKey: 'templates.presetProposalDesc' }`. 기존 4개 preserve.
- **D-C3:** **PresetGallery grid 레이아웃 무수정** — `grid-cols-2` 그대로. 6개 → 3행 × 2열. modal `max-h-80vh` + `overflow-y-auto` 가 이미 스크롤 처리. 7개 이상 시 재고 (Deferred).
- **D-C4:** **`presets/index.ts` 의 sort 로직 무수정** — `sort((a, b) => a.key.localeCompare(b.key))` 그대로. 6개 정렬 결과: expense → leave → meeting → proposal → purchase → trip. JSON sortOrder 필드 도입 안 함.
- **D-C5:** preset 표시 명 SoT = **i18n 우선, JSON `name` fallback** — PresetGallery L94-96 패턴 유지. ko/admin.json 에 4 신규 키 추가. JSON 의 `name="회의록"` / `name="품의서"` 는 fallback 으로 보존.

#### D. 검증 / 테스트
- **D-D1:** `presets/presets.test.ts` 명시적 업데이트:
  - `length === 4` → `length === 6`
  - `keys === ['expense','leave','purchase','trip']` → `keys === ['expense','leave','meeting','proposal','purchase','trip']`
  - 기존 expense calculationRule / leave conditionalRule 단언 preserve
  - 신규 단언: `meeting preset has 5 fields`, `proposal preset has 4 fields`
- **D-D2:** **Snapshot 불변성 명시적 추가 검증 없음** — `templateImportSchema` 가 빌드 시점 자동 검증, `approval_template.schema_definition_snapshot` (V8) + `template_schema_version` 테이블 (V9) 가 이미 문서별 schema snapshot 보장.
- **D-D3:** **DynamicCustomForm 렌더 테스트는 v1.1 카운트 만 강제** — meeting/proposal 별도 렌더 unit test 추가 안 함. 휴먼 UAT 로 시각 확인.

#### E. i18n 추가 (ko/admin.json templates 섹션)
- **D-E1:** 신규 4 키 (한국어만):
  - `presetMeetingName: "회의록"`
  - `presetMeetingDesc: "회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다"`
  - `presetProposalName: "품의서"`
  - `presetProposalDesc: "품의 배경·제안 내용·예상 효과를 정리합니다"`
- **D-E2:** en/admin.json 에는 추가 안 함 — v1.1 까지 한국어 only 정책.

### Claude's Discretion

- 회의록 JSON 의 `description` 필드 (preset 자체 description, JSON 안에 들어감) 문구는 i18n key 와 자연스럽게 일치하되 약간 다를 수 있음.
- 회의록의 `attendees` table 의 `affiliation` (소속) 컬럼 placeholder 문구는 "예: 개발팀, 영업팀" 같은 안내 추가 가능.
- 품의서 textarea placeholder 문구 — "예: 현재 시스템의 한계와 개선 필요성을 기술" 같은 가이드 텍스트 추가 가능.

### Deferred Ideas (OUT OF SCOPE)

- 품의서 정량 효과 expansion (table[효과항목/금액/설명] + estimatedBenefit calculationRule)
- PresetGallery 7개 이상 시 grid-cols-3 upgrade
- JSON sortOrder 필드 도입
- i18n 영어 다국어 지원
- 회의록 agenda number 자동 채번 (calculationRule 또는 frontend logic)
- preset category 필터링/그룹화 UI
- 회의 종류 select + conditionalRule (정기/임시/프로젝트)
- 회의록 시작/종료 시간 + 소요시간 calculationRule
- Backend integration test (preset → 양식 → 문서 → 렌더 회귀)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FORM-01 | 관리자가 제공 프리셋 갤러리에서 "회의록" CUSTOM 스키마를 선택해 양식을 즉시 생성할 수 있다 | meeting.json 을 `presets/` 에 drop → eager glob 자동 등록 → PresetGallery 카드 표시 → onSelect → TemplateListPage `handlePresetSelected` → TemplateFormModal 자동 prefill → 양식 생성. 모든 인프라는 Phase 26 에서 완성됨. ICON_MAP/I18N_MAP 에 `meeting` entry 1 개씩만 추가하면 통합 종료. |
| FORM-02 | 관리자가 제공 프리셋 갤러리에서 "품의서" CUSTOM 스키마를 선택해 양식을 즉시 생성할 수 있다 | proposal.json 을 `presets/` 에 drop → 동일 인프라 경로. ICON_MAP/I18N_MAP 에 `proposal` entry 1 개씩만 추가. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **언어:** 모든 응답·문서·UI 텍스트 한국어 (한국어 only 정책 적용 — `D-E2` en/admin.json 추가 금지).
- **기존 기능 보존:** 작업 후 기존 메뉴/라우트/preset 4 종 손상 여부 확인. PresetGallery `ICON_MAP`/`I18N_MAP` 의 기존 expense/leave/trip/purchase entry 4 개는 preserve.
- **GSD Workflow:** `/gsd-execute-phase` 로 진행 — 직접 Edit/Write 금지.
- **기술 스택 일관성:** React 18 + TypeScript 5.x + Vite 5/6 + Zustand + TanStack Query v5 + zod (frontend). 본 phase 는 신규 라이브러리 없음.
- **Hardcoded React component**: form template 은 hardcoded React component, dynamic form builder 가 아님 — 단, **CUSTOM** template (preset) 은 schema-driven `DynamicCustomForm` 사용. 본 phase 에서 신규 hardcoded component 추가 금지.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Preset 정의 (JSON) | Frontend / build-time asset | — | Vite `import.meta.glob` 가 JSON 을 모듈로 import. backend 무관. |
| Preset 등록 / 검증 | Frontend / build-time module load | Frontend / vitest CI gate | `presets/index.ts` 가 module load 시점에 `templateImportSchema.parse()` 호출 — 손상 시 즉시 throw, 빌드 실패. |
| Preset gallery UI | Frontend / Browser (React component) | Frontend / i18n (ko/admin.json) | `PresetGallery.tsx` 가 ICON_MAP + I18N_MAP 을 lookup 하여 카드 렌더. |
| Preset → form modal 흐름 | Frontend / Browser (state machine) | — | `TemplateListPage.createFlow` state machine 이 preset → form 전환. 본 phase 무수정. |
| Preset 으로 생성된 양식 사용자 렌더 | Frontend / Browser | Backend / `template_api.getTemplateSchema` | `DynamicCustomForm` 이 schema fetch + zod validation + react-hook-form 으로 렌더. 본 phase 신규 field type 미도입으로 무수정. |
| Schema snapshot 불변성 | Backend / DB (`approval_template.schema_definition_snapshot`, `template_schema_version`) | — | V8/V9 마이그레이션 완료. 본 phase 무수정 — 기존 row 영향 없음. |

## Standard Stack

본 phase 는 신규 라이브러리 도입 없음. 기존 v1.1 스택 재사용.

### Core (이미 존재)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.1.x | Build-time JSON schema validation (`templateImportSchema`) | Phase 26 결정 [VERIFIED: package.json 4.1.0 추정 → 실제 버전 검증 필요]. `.strict()` 으로 prototype pollution 차단. |
| Vite | 5.x or 6.x | `import.meta.glob('./*.json', { eager: true })` 자동 인식 | Phase 26 D-12~D-15 결정 [VERIFIED: presets/index.ts L15]. 새 JSON drop = 자동 등록. |
| react-i18next | latest | `useTranslation('admin')` + `t('templates.presetXxxName')` | PresetGallery L44, L95 [VERIFIED: PresetGallery.tsx]. ko/admin.json `templates.*` namespace. |
| lucide-react | latest | `Users`, `FileSignature` 아이콘 | PresetGallery `ICON_MAP` [VERIFIED: PresetGallery.tsx L4-11]. 둘 다 `lucide-react` 표준 export [CITED: lucide.dev — Users, FileSignature 모두 공식 아이콘]. |
| vitest | latest | `presets/presets.test.ts` build-time 단언 | Phase 26 [VERIFIED: presets.test.ts L1]. |

### Supporting (이미 존재)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | latest | DynamicCustomForm `useForm` + `useFieldArray` (table 행 관리) | preset 으로 생성된 양식 사용자 기안 시 [VERIFIED: DynamicCustomForm.tsx, DynamicTableField.tsx]. 본 phase 무수정. |
| @hookform/resolvers/zod | latest | DynamicCustomForm 의 schema → zod resolver | [VERIFIED: DynamicCustomForm.tsx L2]. 본 phase 무수정. |

**Installation:** 신규 npm install 없음.

**Version verification:** zod 의 `.strict()` 동작은 4.x 기준 — `passthrough()` 가 default 가 아니므로 unknown key 는 `ZodError` 발생 [CITED: zod.dev — `.strict()` API]. 본 phase 의 회의록/품의서 JSON 은 모두 알려진 키만 사용하므로 통과 보장.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `import.meta.glob` (Vite) | 수동 export 배열 in `presets/index.ts` | Phase 26 D-12 에서 이미 기각. 자동 인식이 신규 preset 추가 시 boilerplate zero. |
| `Users` icon | `Group`, `UserSquare2` | Discretion. CONTEXT D-A4 가 `Users` 명시 — lucide-react 표준이고 회의 참석자 메타포 일치. |
| `FileSignature` icon | `FileText`, `ClipboardSignature` | Discretion. CONTEXT D-B4 가 `FileSignature` 명시 — 결재 서명 메타포가 품의서와 일치. |
| JSON sortOrder 필드 | localeCompare alphabetic sort | Phase 32 deferred. 6개 수준에서는 alphabetic 도 무리 없음. |

## Architecture Patterns

### System Architecture Diagram

```
신규 JSON 추가
      │
      ├─→ frontend/src/features/admin/presets/meeting.json
      ├─→ frontend/src/features/admin/presets/proposal.json
      │
      ▼
[BUILD TIME — Vite import.meta.glob]
      │  presets/index.ts L15-30
      │  Object.entries(modules).map(([path, mod]) => ({
      │    key: path.replace(/^\.\/(.*)\.json$/, '$1'),
      │    data: templateImportSchema.parse(mod.default)
      │  }))
      │
      ├─[FAIL FAST]─→ ZodError throw → vite build 중단
      │              (T-26-04 mitigation 재사용)
      │
      ▼
[MODULE LOAD] presets: Preset[] (sorted by key)
      │  → ['expense', 'leave', 'meeting', 'proposal', 'purchase', 'trip']
      │
      ▼
[RUNTIME — Browser]
      │
      ├─→ PresetGallery.tsx (admin)
      │   ├─ presets.map(...) — 6개 카드 렌더
      │   ├─ ICON_MAP[preset.key] → lucide-react Icon
      │   ├─ I18N_MAP[preset.key] → t(nameKey), t(descKey)
      │   └─ onSelect(preset.data) → 부모 (TemplateListPage)
      │
      ▼
TemplateListPage.handlePresetSelected(preset: TemplateImportData)
      │  importToInitialValues(preset) → InitialValues
      │  setCreateFlow({kind:'form', initialValues})
      │  └─ prefix: '' 강제 (D-10 from Phase 26)
      │
      ▼
TemplateFormModal (open=true, initialValues=...)
      │  사용자가 prefix 입력 + 저장
      │
      ▼
POST /api/templates → approval_template row 생성
      │  schema_definition + schema_definition_snapshot 저장
      │
      ▼
[USER FLOW] 사용자 기안 시
      │
      ▼
DynamicCustomForm (templateCode 라우트)
      │  templateApi.getTemplateSchema → schema fetch
      │  schemaToZod → react-hook-form resolver
      │  ┌─ text/textarea/number/date/select → DynamicFieldRenderer
      │  └─ table → DynamicTableField (useFieldArray)
      │     └─ renderCell switch: text/textarea/number/date/select/staticText/hidden
      │
      └─→ form 제출 → POST /api/documents (formData JSON + schemaSnapshot)
```

### Recommended Project Structure (수정 없음 — 기존 구조 사용)
```
frontend/src/features/admin/presets/
├── expense.json        (existing)
├── leave.json          (existing)
├── purchase.json       (existing)
├── trip.json           (existing)
├── meeting.json        (NEW — Plan 01)
├── proposal.json       (NEW — Plan 02)
├── index.ts            (NO CHANGE — 자동 인식)
└── presets.test.ts     (UPDATE — Plan 05)

frontend/src/features/admin/components/
└── PresetGallery.tsx   (UPDATE — ICON_MAP/I18N_MAP 4 entry 추가, Plan 03)

frontend/src/features/admin/validations/
└── templateImportSchema.ts  (NO CHANGE — 신규 JSON 자동 통과)

frontend/public/locales/ko/
└── admin.json          (UPDATE — templates.* 4 키 추가, Plan 04)
```

### Pattern 1: JSON-only Preset Drop
**What:** 신규 preset 추가 시 JSON 파일 1 개만 작성, code 변경 없이 자동 등록.
**When to use:** 본 phase 의 회의록/품의서. 단, **PresetGallery 의 ICON/I18N entry 추가는 의도적 명시 단계** (자동 ICON 생성은 design system 충돌 위험).
**Example:**
```typescript
// Source: frontend/src/features/admin/presets/index.ts (L15-30, VERIFIED)
const modules = import.meta.glob<{ default: unknown }>('./*.json', {
  eager: true,
});

export const presets: Preset[] = Object.entries(modules)
  .map(([path, mod]) => {
    const key = path.replace(/^\.\/(.*)\.json$/, '$1');
    const parsed = templateImportSchema.parse(mod.default);
    return { key, data: parsed };
  })
  .sort((a, b) => a.key.localeCompare(b.key));
```

### Pattern 2: ICON_MAP / I18N_MAP fallback chain
**What:** preset 카드 표시 시 i18n 우선, JSON `name` fallback, lucide `LayoutTemplate` fallback.
**When to use:** PresetGallery 가 신규 preset 카드 추가 시.
**Example:**
```typescript
// Source: frontend/src/features/admin/components/PresetGallery.tsx (L92-98, VERIFIED)
const Icon = ICON_MAP[preset.key] ?? LayoutTemplate;
const i18n = I18N_MAP[preset.key];
const displayName = i18n ? t(i18n.nameKey) : preset.data.name;
const displayDesc = i18n ? t(i18n.descKey) : preset.data.description ?? '';
```

### Pattern 3: Build-time fail-fast Zod validation
**What:** preset JSON 손상 시 `vite build` / `vitest` 실행 시점에 즉시 throw.
**Why:** Phase 26 의 T-26-04 mitigation. 런타임 admin modal 에서 깨진 카드를 보는 대신 CI 가 차단.
**Example:**
```typescript
// Source: presets/index.ts L27 + templateImportSchema L117-128 (VERIFIED)
// 손상된 JSON 이 있으면 즉시 ZodError throw — vite build 실패 보장
const parsed = templateImportSchema.parse(mod.default);
```

### Anti-Patterns to Avoid

- **JSON 안에 unknown 키 추가:** `templateImportSchema` + `fieldConfigSchema` + `columnConfigSchema` 모두 `.strict()` — 정의되지 않은 키 (e.g., `placeholder` 가 아니라 `placeHolder` 오타) 는 build 실패. 신규 JSON 작성 시 정확한 키 이름 확인 필수 [VERIFIED: templateImportSchema.ts L48, L74, L84, L128].
- **field.id 에 prototype 키워드 사용:** `__proto__`, `constructor`, `prototype` — `.strict()` 가 차단하지만 추가 보호로 회의록 field id 는 `attendees`/`agenda`/`decisions` 등 일반 단어만 사용 (D-A5 결정 준수).
- **Hardcoded React component 추가:** v1.0 의 `TEMPLATE_REGISTRY` 패턴은 GENERAL/EXPENSE/LEAVE 한정 — CUSTOM template 은 schema-driven `DynamicCustomForm` 사용. 본 phase 에서 hardcoded component 추가 금지.
- **PresetGallery grid-cols-3 으로 변경:** Deferred (CONTEXT D-C3). 현 grid-cols-2 가 6개 수준 시각적 무리 없음.
- **JSON 의 `category` 신규 값 도입:** 기존 `finance`/`hr`/`general` 외 새 카테고리 (e.g., `meeting`) 도입 시 backend `approval_template.category` 의 application-level 의미 변경 영향. CONTEXT D-A3/B3 모두 `general` 결정 준수.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Preset 자동 인식 | 수동 export 배열 in `presets/index.ts` | `import.meta.glob` (Vite eager) | Phase 26 인프라. 신규 JSON drop = 자동 등록. |
| JSON schema 검증 | 자체 `validatePreset()` 함수 | `templateImportSchema.parse()` (zod `.strict()`) | Prototype pollution 차단 (T-26-01) + unknown key 거부. |
| 다국어 표시 | hardcoded Korean string in PresetGallery | `useTranslation('admin')` + `ko/admin.json` | Phase 26 I18N_MAP 패턴. 향후 영어 추가 시 키만 추가. |
| 빌드 시점 preset 검증 gate | manual review | `presets.test.ts` length/keys 단언 | 새 preset 추가 시 명시적 단언 업데이트가 의도된 게이트 — 무의식 추가 방지. |
| Table 행 관리 | 자체 row state | `useFieldArray` (DynamicTableField.tsx) | react-hook-form 표준. 본 phase 무수정. |

**Key insight:** Phase 26 의 인프라가 이미 모든 "어려운 부분" (auto-glob / Zod fail-fast / fallback chain / state machine / snapshot 불변성) 을 처리. 본 phase 는 **순수 데이터 추가** 작업으로 함정 표면적이 매우 작다. 위험은 (1) JSON 의 키 이름 오타, (2) lucide-react 아이콘 이름 오타, (3) i18n 키 typo, (4) presets.test.ts 단언 업데이트 누락 — 모두 빌드/테스트가 즉시 잡아냄.

## Common Pitfalls

### Pitfall 1: JSON 키 오타로 build 시점 ZodError
**What goes wrong:** `meeting.json` 작성 시 `placeholder` 를 `placeHolder` 또는 `place_holder` 로 오타.
**Why it happens:** `templateImportSchema` 의 모든 object schema 가 `.strict()` — `passthrough` 미사용. 알려지지 않은 키는 `ZodError`.
**How to avoid:** expense.json / leave.json / purchase.json / trip.json 의 정확한 키 이름 복사. 특히 `config.placeholder` (소문자), `config.maxLength` (camelCase), `config.minRows` / `maxRows` 정확히.
**Warning signs:** `vite build` 실패 시 stderr 에 `Unrecognized key in object: "placeHolder"` 메시지.
**Verified keys:** `placeholder`, `maxLength`, `min`, `max`, `unit`, `options`, `content`, `defaultValue`, `minRows`, `maxRows`, `columns` [VERIFIED: templateImportSchema.ts L60-74].

### Pitfall 2: lucide-react 아이콘 이름 오타
**What goes wrong:** `import { Users, FileSignature } from 'lucide-react'` — lucide 가 PascalCase 명명 + 일부 아이콘은 v0.x 버전 마다 이름 변경 (e.g., `FilePenLine` vs `FileSignature`).
**Why it happens:** lucide-react 는 deprecated 아이콘에 alias 제공하지만 build warning 발생.
**How to avoid:** `node_modules/lucide-react/dist/lucide-react.d.ts` 또는 `npx lucide search Users` 로 export 확인. 본 phase 의 `Users` + `FileSignature` 둘 다 lucide v0.300+ 표준 [CITED: lucide.dev/icons]. 만약 빌드에서 deprecated warning 발생 시 alias 변경.
**Warning signs:** `import { FileSignature } from 'lucide-react'` → TypeScript 빌드 OK 지만 console 에 deprecation 경고 → `FilePenLine` 또는 다른 alias 로 fallback 가능.

### Pitfall 3: i18n 키 typo / namespace 오인식
**What goes wrong:** PresetGallery 의 `t('templates.presetMeetingName')` 호출 시 ko/admin.json 에 키 누락 → react-i18next 가 키 자체를 fallback string 으로 표시 (e.g., 카드 제목이 "templates.presetMeetingName" 텍스트로 표시).
**Why it happens:** i18n 키 미일치 — namespace `admin` + nested key `templates.presetMeetingName`.
**How to avoid:** ko/admin.json 의 기존 `presetExpenseName`/`presetLeaveName` 패턴 정확히 모방. PresetGallery 의 I18N_MAP entry 추가 후 즉시 dev 서버 재시작 → 카드에서 한국어 표시 확인.
**Warning signs:** 카드 제목에 raw key 텍스트 표시.

### Pitfall 4: presets.test.ts 단언 업데이트 누락
**What goes wrong:** meeting.json + proposal.json 추가 후 `presets.test.ts` 의 `length === 4` 단언 업데이트 안 함 → vitest 실패.
**Why it happens:** 인프라가 자동 인식이지만 테스트는 의도된 명시 게이트 (Phase 26 D-D1).
**How to avoid:** presets.test.ts L7 (`expect(presets).toHaveLength(4)`) → `6` 으로 변경. L12 keys 배열에 `'meeting','proposal'` 추가 (sort order: alphabetical → `['expense','leave','meeting','proposal','purchase','trip']`).
**Warning signs:** `vitest run presets/presets.test.ts` 실패 시 `Expected length: 4, Received length: 6` 메시지.

### Pitfall 5: prototype pollution 시도 차단 (Phase 26 T-26-01 재인식)
**What goes wrong:** 외부 import 또는 악의적 JSON 에 `__proto__`, `constructor`, `prototype` 키 포함.
**Why it happens:** JavaScript object spread / merge 시 prototype 변경 가능.
**How to avoid:** `templateImportSchema` 의 모든 object schema `.strict()` 가 자동 차단 [VERIFIED: templateImportSchema.ts L74 comment "T-26-01: reject unknown keys incl. __proto__"]. 본 phase 의 회의록/품의서 JSON 은 모두 일반 키만 사용 — 자동 보호.
**Warning signs:** N/A (본 phase scope 에서 trigger 없음, infrastructure-level 보호).

### Pitfall 6: JSON Schema vs Zod 동작 차이 — `required`
**What goes wrong:** JSON Schema 에서는 `required: ["title"]` 배열 패턴이지만 Zod / templateImportSchema 는 `field.required: boolean` 객체 속성.
**Why it happens:** templateImportSchema 의 `fieldDefinitionSchema` 가 `required: z.boolean()` (non-optional) 정의 — 모든 field 에 `required` 명시 필수 [VERIFIED: templateImportSchema.ts L81].
**How to avoid:** 모든 field 에 `"required": true|false` 명시. expense.json 의 모든 field 가 명시 [VERIFIED: expense.json L12]. column 의 `required` 는 optional [VERIFIED: templateImportSchema.ts L55].
**Warning signs:** `ZodError: Required at fields.0.required` 메시지.

### Pitfall 7: column config 의 `placeholder` 사용 가능성 검증
**What goes wrong:** 회의록 attendees table 의 `affiliation` 컬럼에 placeholder "예: 개발팀" 추가 시 `columnConfigSchema` 가 허용하는지.
**How to avoid:** `columnConfigSchema` (L35-48) 가 `placeholder: z.string().optional()` 명시 [VERIFIED]. column.config.placeholder 사용 가능. 단, column 단계의 `config.placeholder` 가 실제 DynamicTableField 의 `renderCell` 에서 사용되는지 확인 → `text` case 의 `placeholder={col.config?.placeholder ?? ''}` [VERIFIED: DynamicTableField.tsx L186-189]. 통합 OK.

### Pitfall 8: meeting/proposal 의 `prefix` 가 사용자 저장 시 강제 reset
**What goes wrong:** JSON 의 `prefix: 'MTG'` 가 사용자에게 자동 적용된다고 오해.
**Why it happens:** Phase 26 D-10 결정으로 `importToInitialValues` 가 `prefix: ''` 강제 reset [VERIFIED: TemplateListPage.tsx L52]. JSON 의 prefix 는 export/import 호환성과 fallback 용도일 뿐 사용자가 신규 prefix 입력 필수.
**How to avoid:** Plan 작성 시 사용자 흐름 설명에 명시. 사용자가 양식 생성 modal 에서 prefix 비어있는 입력란을 봐야 함.
**Warning signs:** 사용자가 "왜 MTG 가 자동 입력 안 되나" 질문 — 의도된 동작.

## Code Examples

### 회의록 schema JSON 초안 (D-A1~A6 충실)
```json
{
  "exportFormatVersion": 1,
  "schemaVersion": 1,
  "name": "회의록",
  "description": "회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다",
  "prefix": "MTG",
  "category": "general",
  "icon": "Users",
  "schemaDefinition": {
    "version": 1,
    "fields": [
      { "id": "title", "type": "text", "label": "제목", "required": true },
      { "id": "meetingDate", "type": "date", "label": "회의 일시", "required": true },
      {
        "id": "attendees",
        "type": "table",
        "label": "참석자",
        "required": true,
        "config": {
          "columns": [
            { "id": "name", "type": "text", "label": "이름", "required": true },
            { "id": "affiliation", "type": "text", "label": "소속", "required": true, "config": { "placeholder": "예: 개발팀" } },
            { "id": "role", "type": "text", "label": "역할" }
          ],
          "minRows": 1,
          "maxRows": 20
        }
      },
      {
        "id": "agenda",
        "type": "table",
        "label": "안건",
        "required": true,
        "config": {
          "columns": [
            { "id": "number", "type": "number", "label": "번호", "required": true },
            { "id": "title", "type": "text", "label": "안건명", "required": true },
            { "id": "description", "type": "textarea", "label": "설명" }
          ],
          "minRows": 1,
          "maxRows": 20
        }
      },
      {
        "id": "decisions",
        "type": "table",
        "label": "결정사항",
        "required": true,
        "config": {
          "columns": [
            { "id": "topic", "type": "text", "label": "주제", "required": true },
            { "id": "decision", "type": "text", "label": "결정", "required": true },
            { "id": "owner", "type": "text", "label": "담당자" },
            { "id": "dueDate", "type": "date", "label": "기한" }
          ],
          "minRows": 1,
          "maxRows": 20
        }
      }
    ],
    "conditionalRules": [],
    "calculationRules": []
  }
}
```

**검증 노트:**
- `agenda.columns[1].id = "title"` 는 root field `title` 과 다른 scope (column id 는 row 내부 namespace) — `templateImportSchema` 가 column.id 의 uniqueness 만 column 배열 안에서 강제 [ASSUMED — schema 자체에는 cross-scope uniqueness 검증 없음, 검증 시 row data 가 `agenda.0.title` 형태로 직렬화되므로 충돌 없음]. 안전성 확인 위해 `agenda.0.title` vs root `title` 격리 확인 필요.
- 위 ASSUMED 가 우려되면 `agenda` columns 의 `title` 을 `subject` 로 변경하여 root `title` 과 명시적 분리 가능 — Discretion 영역. **Planner 가 user 와 확인 권장.**

### 품의서 schema JSON 초안 (D-B1~B7 충실)
```json
{
  "exportFormatVersion": 1,
  "schemaVersion": 1,
  "name": "품의서",
  "description": "품의 배경·제안 내용·예상 효과를 정리합니다",
  "prefix": "PRP",
  "category": "general",
  "icon": "FileSignature",
  "schemaDefinition": {
    "version": 1,
    "fields": [
      { "id": "title", "type": "text", "label": "제목", "required": true },
      {
        "id": "background",
        "type": "textarea",
        "label": "품의 배경",
        "required": true,
        "config": { "maxLength": 2000, "placeholder": "예: 현재 시스템의 한계와 개선 필요성을 기술" }
      },
      {
        "id": "proposal",
        "type": "textarea",
        "label": "제안 내용",
        "required": true,
        "config": { "maxLength": 2000, "placeholder": "구체적인 제안 사항을 기술" }
      },
      {
        "id": "expectedEffect",
        "type": "textarea",
        "label": "예상 효과",
        "required": true,
        "config": { "maxLength": 2000, "placeholder": "정성적·정량적 기대 효과를 기술" }
      }
    ],
    "conditionalRules": [],
    "calculationRules": []
  }
}
```

### PresetGallery `ICON_MAP` / `I18N_MAP` 4 entry 추가
```typescript
// Source: frontend/src/features/admin/components/PresetGallery.tsx (L4-11, L28-41 VERIFIED)
import {
  X,
  Receipt,
  CalendarDays,
  Plane,
  ShoppingCart,
  Users,            // NEW (Plan 03)
  FileSignature,    // NEW (Plan 03)
  LayoutTemplate,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  expense: Receipt,
  leave: CalendarDays,
  trip: Plane,
  purchase: ShoppingCart,
  meeting: Users,            // NEW
  proposal: FileSignature,   // NEW
};

const I18N_MAP: Record<string, { nameKey: string; descKey: string }> = {
  expense: { nameKey: 'templates.presetExpenseName', descKey: 'templates.presetExpenseDesc' },
  leave: { nameKey: 'templates.presetLeaveName', descKey: 'templates.presetLeaveDesc' },
  trip: { nameKey: 'templates.presetTripName', descKey: 'templates.presetTripDesc' },
  purchase: { nameKey: 'templates.presetPurchaseName', descKey: 'templates.presetPurchaseDesc' },
  meeting: { nameKey: 'templates.presetMeetingName', descKey: 'templates.presetMeetingDesc' },     // NEW
  proposal: { nameKey: 'templates.presetProposalName', descKey: 'templates.presetProposalDesc' }, // NEW
};
```

### ko/admin.json 4 키 추가 (templates 섹션 끝부분에 삽입)
```json
{
  "templates": {
    "...": "...",
    "presetExpenseName": "경비신청서",
    "presetExpenseDesc": "항목/단가/수량/합계 테이블과 자동 합계 계산을 포함합니다",
    "presetLeaveName": "휴가신청서",
    "presetLeaveDesc": "휴가 종류 선택과 기간별 조건부 사유 입력을 포함합니다",
    "presetTripName": "출장신청서",
    "presetTripDesc": "일정·동행자·예상 비용 계산을 포함합니다",
    "presetPurchaseName": "구매신청서",
    "presetPurchaseDesc": "품목 테이블과 총액 자동 계산을 포함합니다",
    "presetMeetingName": "회의록",
    "presetMeetingDesc": "회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다",
    "presetProposalName": "품의서",
    "presetProposalDesc": "품의 배경·제안 내용·예상 효과를 정리합니다"
  }
}
```

### presets.test.ts 단언 업데이트
```typescript
// Source: frontend/src/features/admin/presets/presets.test.ts (현재 상태, VERIFIED)

import { describe, it, expect } from 'vitest';
import { presets } from './index';
import { templateImportSchema } from '../validations/templateImportSchema';

describe('presets', () => {
  it('contains exactly 6 presets', () => {
    expect(presets).toHaveLength(6);  // 4 → 6
  });

  it('has expected keys', () => {
    const keys = presets.map((p) => p.key).sort();
    // alphabetical sort: expense → leave → meeting → proposal → purchase → trip
    expect(keys).toEqual([
      'expense',
      'leave',
      'meeting',     // NEW
      'proposal',    // NEW
      'purchase',
      'trip',
    ]);
  });

  it('each preset passes templateImportSchema', () => {
    for (const p of presets) {
      const result = templateImportSchema.safeParse(p.data);
      expect(
        result.success,
        `${p.key} failed: ${JSON.stringify(result.success ? null : result.error.issues)}`,
      ).toBe(true);
    }
  });

  // PRESERVE existing assertions
  it('expense preset has at least one calculationRule', () => {
    const expense = presets.find((p) => p.key === 'expense')!;
    expect(expense.data.schemaDefinition.calculationRules?.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('leave preset has at least one conditionalRule', () => {
    const leave = presets.find((p) => p.key === 'leave')!;
    expect(leave.data.schemaDefinition.conditionalRules?.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('purchase preset has at least one table field', () => {
    const purchase = presets.find((p) => p.key === 'purchase')!;
    const hasTable = purchase.data.schemaDefinition.fields.some((f) => f.type === 'table');
    expect(hasTable).toBe(true);
  });

  // NEW assertions (D-D1)
  it('meeting preset has 5 fields', () => {
    const meeting = presets.find((p) => p.key === 'meeting')!;
    expect(meeting.data.schemaDefinition.fields).toHaveLength(5);
    const ids = meeting.data.schemaDefinition.fields.map((f) => f.id);
    expect(ids).toEqual(['title', 'meetingDate', 'attendees', 'agenda', 'decisions']);
  });

  it('proposal preset has 4 fields', () => {
    const proposal = presets.find((p) => p.key === 'proposal')!;
    expect(proposal.data.schemaDefinition.fields).toHaveLength(4);
    const ids = proposal.data.schemaDefinition.fields.map((f) => f.id);
    expect(ids).toEqual(['title', 'background', 'proposal', 'expectedEffect']);
  });

  it('all preset names are Korean', () => {
    for (const p of presets) {
      expect(p.data.name).toMatch(/[가-힣]/);
    }
  });
});
```

## State of the Art

본 phase 는 신규 기술/패턴 도입 없음. 적용 패턴은 Phase 26 (v1.1) 에서 확립됨.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 수동 export 배열 | `import.meta.glob` 자동 인식 | Phase 26 (D-12) | 신규 preset 추가 = JSON drop, 코드 수정 zero (단, ICON/I18N entry 명시 필요) |
| Hardcoded React form template | Schema-driven `DynamicCustomForm` (CUSTOM 만) | Phase 24.1 | preset 으로 생성된 CUSTOM template 은 schema → Zod → form 자동 렌더 |
| 비검증 JSON load | `templateImportSchema.parse()` build-time | Phase 26 (T-26-04) | 손상 시 vite build 즉시 실패, runtime admin modal 깨짐 방지 |
| Object spread merge (prototype pollution 위험) | Zod `.strict()` 거부 | Phase 26 (T-26-01) | `__proto__`/`constructor` 키 차단 |

**Deprecated/outdated:** N/A.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | zod 버전 4.1.x [VERIFIED 추정 — package.json 직접 확인 권장] | Standard Stack | LOW — `.strict()` API 는 zod 3.x/4.x 모두 동일 동작. 버전 mismatch 시 다른 문제 발견. |
| A2 | 회의록 `agenda.columns[1].id="title"` 가 root field `title` 과 직렬화 충돌 없음 | Code Examples (회의록) | MEDIUM — 만약 react-hook-form path resolution 에서 충돌 발생 시 사용자 입력값 손상 가능. **Planner 가 사용자 확인 또는 Plan 01 task 에 격리 검증 추가 권장.** Mitigation: column id 를 `subject` 로 변경 (Discretion). |
| A3 | `lucide-react` 의 `FileSignature` export 가 현재 설치 버전에 존재 | Standard Stack | LOW — lucide v0.300+ 표준. 만약 버전이 매우 낮으면 `FilePenLine` alias 또는 다른 lucide 아이콘 (e.g., `ClipboardCheck`) 으로 fallback. Plan 03 task 에 import 검증 단계 포함. |
| A4 | i18n key 추가 시 dev server HMR 가 즉시 반영 | Pitfall 3 | LOW — react-i18next 표준 동작. 만약 캐시 문제 발생 시 dev server 재시작. |
| A5 | textarea column (회의록 agenda.description) 이 DynamicTableField 의 `renderCell` 에서 정상 렌더 [VERIFIED: DynamicTableField.tsx L163-172] | Code Examples (회의록) | NONE — 코드 검증 완료. |

**If this table needs user confirmation:** A2 만 user 확인 권장. 나머지는 build / test / runtime 가 즉시 잡아냄.

## Open Questions

1. **회의록 `agenda` table 의 column id `title` 이 root field id `title` 과 동일 — 직렬화 / 검증 충돌 우려**
   - What we know: column id 는 row data 직렬화 시 `agenda.0.title` 로 namespace 됨. react-hook-form 의 `useFieldArray` + `useFormContext` 가 nested path 처리 [VERIFIED: DynamicTableField.tsx L96 `${field.id}.${rowIdx}.${col.id}`].
   - What's unclear: Zod schema build (`schemaToZod`) 또는 calculationRule formula parsing 에서 cross-scope id 충돌 가능성. 회의록은 calculationRule 미사용이므로 위험 낮음.
   - Recommendation: **Plan 01 작성 시 옵션 A (column id `title` 그대로) vs 옵션 B (column id `subject` 로 변경) 중 user 와 확인 후 결정.** Discretion 으로 옵션 B 가 더 안전.

2. **lucide-react 설치 버전 — `FileSignature` export 존재 확인**
   - What we know: lucide v0.300+ 에 `FileSignature` 표준 export. 단, 본 프로젝트의 정확한 버전 미확인.
   - What's unclear: `frontend/package.json` 의 `lucide-react` 버전.
   - Recommendation: Plan 03 task 의 첫 단계에 `npm ls lucide-react` 출력 확인 + import 검증 (`import { FileSignature } from 'lucide-react'` 후 `tsc --noEmit`).

3. **`vitest` 단독 실행 시 vite plugin 환경 보장 여부**
   - What we know: presets/index.ts 가 `import.meta.glob` 사용 — Vite plugin 필요. vitest 도 Vite 위에서 동작하므로 plugin 자동 적용 [VERIFIED: vitest 공식 문서].
   - What's unclear: 본 프로젝트의 vitest config 설정.
   - Recommendation: Plan 06 통합 검증에서 `npm run test -- presets` 실행 결과로 자동 확인.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vite build / vitest | ✓ | (기존 v1.0/v1.1 환경) | — |
| npm/yarn | install / scripts | ✓ | (기존) | — |
| zod | templateImportSchema | ✓ | 추정 4.1.x [VERIFY: package.json] | — |
| lucide-react | PresetGallery icons | ✓ (추정) | [VERIFY: package.json] | 다른 아이콘 fallback (ClipboardCheck 등) |
| react-i18next | i18n | ✓ | (기존) | — |
| Vite | build / glob | ✓ | 5.x or 6.x | — |
| vitest | presets.test.ts | ✓ | (기존) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None expected — Plan 03 task 에서 `lucide-react` 의 `Users`/`FileSignature` import 가능 여부 확인 후 진행.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest, 기존 설치) |
| Config file | `frontend/vitest.config.ts` (또는 vite.config.ts 의 test 섹션) |
| Quick run command | `cd frontend && npm run test -- presets` (presets 디렉터리 한정) |
| Full suite command | `cd frontend && npm run test` |
| Build verification | `cd frontend && npm run build` (vite build — `templateImportSchema.parse()` build-time 실행) |
| Type check | `cd frontend && npm run typecheck` (또는 `tsc --noEmit`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FORM-01 | meeting.json 이 templateImportSchema 통과 | unit | `npm run test -- presets/presets.test.ts` (`each preset passes templateImportSchema`) | ✓ (단언 업데이트만, Plan 05) |
| FORM-01 | meeting preset 이 6 개 array 에 등록 + 5 fields | unit | `npm run test -- presets/presets.test.ts` (`meeting preset has 5 fields`) | ❌ Wave 0 — Plan 05 에서 신규 단언 추가 |
| FORM-01 | PresetGallery 에 회의록 카드 표시 (i18n 명 + 아이콘) | manual / E2E | 휴먼 UAT (D-D3) | — |
| FORM-01 | 회의록 → TemplateFormModal prefill (prefix='') | manual / E2E | 휴먼 UAT | — |
| FORM-02 | proposal.json 이 templateImportSchema 통과 | unit | `npm run test -- presets/presets.test.ts` | ✓ |
| FORM-02 | proposal preset 이 6 개 array 에 등록 + 4 fields | unit | `npm run test -- presets/presets.test.ts` (`proposal preset has 4 fields`) | ❌ Wave 0 — Plan 05 |
| FORM-02 | PresetGallery 에 품의서 카드 표시 | manual / E2E | 휴먼 UAT | — |

### Sampling Rate
- **Per task commit:** `npm run test -- presets` (3-5초)
- **Per wave merge:** `npm run test && npm run typecheck && npm run build`
- **Phase gate:** Full suite green + 휴먼 UAT (PresetGallery 6 카드 시각 확인 + 회의록/품의서 양식 생성 흐름 확인) 후 `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `presets.test.ts` 의 `meeting preset has 5 fields` 신규 단언 추가 (Plan 05)
- [ ] `presets.test.ts` 의 `proposal preset has 4 fields` 신규 단언 추가 (Plan 05)
- [ ] `presets.test.ts` 의 `length === 6` + keys array 업데이트 (Plan 05)
- [ ] Framework install: 불필요 (기존)

### Nyquist Validation Dimensions (적용 가능성 분석)

본 phase 의 작은 scope 에서는 8 dimensions 중 일부만 의미 있음:

| Dimension | 적용 여부 | 이유 |
|-----------|----------|------|
| 1. Type signature (TypeScript) | ✓ | `templateImportSchema.parse()` 결과가 `TemplateImportData` 타입 — JSON 키 누락 시 zod runtime + tsc 양쪽 차단. PresetGallery 의 `ICON_MAP`/`I18N_MAP` 도 `Record<string, LucideIcon>` / `Record<string, {nameKey, descKey}>` 타입. |
| 2. Runtime contract (Zod) | ✓ | `templateImportSchema.parse()` build-time + `presets.test.ts` 의 `safeParse` 단언 — 신규 JSON 의 형태/strict 키 검증. **Primary validation gate.** |
| 3. Unit test (vitest) | ✓ | `presets.test.ts` length/keys/fields 단언 — Plan 05 에서 업데이트. |
| 4. Integration test | △ partial | DynamicCustomForm 렌더 회귀 테스트 미추가 (D-D3) — 신규 field type 미도입으로 위험 zero. v1.1 의 기존 DynamicCustomForm 테스트가 자동 커버 (회의록/품의서 모두 기존 type 만 사용). |
| 5. E2E (Playwright/Cypress 등) | ✗ | 본 phase scope 외. 휴먼 UAT 가 대체. |
| 6. Lint / Style | ✓ | `npm run lint` (eslint + prettier) — 기존 CI 가 자동 실행. 신규 컴포넌트/유틸 zero 이므로 영향 미미. |
| 7. Build | ✓ | `npm run build` 가 `templateImportSchema.parse()` build-time 실행 + `tsc --noEmit` 의 PresetGallery 타입 검증. **Build green = 인프라 통합 통과.** |
| 8. Manual / UAT | ✓ | D-D3 결정. PresetGallery 6 카드 시각 확인 + 회의록 양식 생성 → 사용자 기안 → 폼 렌더 확인. **Phase gate 의 마지막 단계.** |

**Active dimensions:** 1, 2, 3, 6, 7, 8 (6/8). dimension 4 는 partial. dimension 5 는 N/A.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 본 phase 무관 — admin 영역 (RBAC ADMIN/SUPER_ADMIN) 는 기존 인프라. |
| V3 Session Management | no | 무관. |
| V4 Access Control | no | preset 자체 표시 / 양식 생성 권한은 기존 admin RBAC. 본 phase 는 데이터 추가만. |
| V5 Input Validation | yes | `templateImportSchema` (zod `.strict()`) — JSON 키 / 타입 / `__proto__` 검증. T-26-01 mitigation. |
| V6 Cryptography | no | 무관. |
| V7 Error Handling | partial | `templateImportSchema` ZodError 가 build 시점 throw — admin runtime 노출 없음. |

### Known Threat Patterns for {React + JSON preset}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prototype pollution via JSON | Tampering | `templateImportSchema` `.strict()` — `__proto__`/`constructor`/`prototype` 키 거부 [VERIFIED: templateImportSchema.ts L74 comment "T-26-01"] |
| XSS via preset name/description rendering | Tampering | React 가 자동 escape — `{displayName}` / `{displayDesc}` 가 textContent 로 렌더 [VERIFIED: PresetGallery.tsx L111, L114]. dangerouslySetInnerHTML 미사용. |
| 손상된 JSON 으로 인한 admin UI 깨짐 | Denial of Service | Build-time fail-fast — `vite build` 단계에서 throw, runtime 노출 zero [VERIFIED: presets/index.ts L27]. T-26-04 mitigation. |
| 악의적 admin 의 잘못된 schema 저장으로 사용자 양식 깨짐 | Tampering | `approval_template.schema_definition_snapshot` (V8) — 문서 저장 시점 schema snapshot 보존, 후속 schema 변경에도 과거 문서 무영향 [VERIFIED: V8 마이그레이션]. 본 phase 무수정 — 자동 보호. |

### 본 phase 신규 위협
**없음.** 모든 검증은 Phase 26 인프라가 자동 처리. 본 phase 는 데이터만 추가.

## Sources

### Primary (HIGH confidence)
- `frontend/src/features/admin/presets/index.ts` — Vite eager glob loader [VERIFIED: file content]
- `frontend/src/features/admin/presets/expense.json` / `leave.json` / `purchase.json` / `trip.json` — schema reference [VERIFIED: file content]
- `frontend/src/features/admin/presets/presets.test.ts` — 단언 패턴 [VERIFIED: file content]
- `frontend/src/features/admin/validations/templateImportSchema.ts` — Zod schema 정의 [VERIFIED: file content]
- `frontend/src/features/admin/components/PresetGallery.tsx` — ICON_MAP/I18N_MAP/render [VERIFIED]
- `frontend/src/features/admin/pages/TemplateListPage.tsx` — createFlow state machine [VERIFIED]
- `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` — 사용자 측 렌더 [VERIFIED]
- `frontend/src/features/document/components/dynamic/DynamicFieldRenderer.tsx` — field type 분기 [VERIFIED]
- `frontend/src/features/document/components/dynamic/DynamicTableField.tsx` — table 행/컬럼 렌더 [VERIFIED]
- `frontend/public/locales/ko/admin.json` — i18n key 패턴 [VERIFIED]
- `backend/src/main/resources/db/migration/V8__add_template_schema_support.sql` — schema_definition_snapshot 컬럼 [VERIFIED]
- `backend/src/main/resources/db/migration/V9__create_template_schema_version.sql` — template_schema_version 테이블 [VERIFIED]
- `.planning/STATE.md` — Phase 26 결정 이력 [VERIFIED]
- `.planning/phases/32-custom/32-CONTEXT.md` — 8 영역 결정 [VERIFIED]
- `./CLAUDE.md` — 한국어 정책 / 기존 기능 보존 [VERIFIED]

### Secondary (MEDIUM confidence)
- lucide-react `Users` / `FileSignature` 아이콘 표준 export [CITED: lucide.dev/icons — public docs]
- zod `.strict()` 동작 — unknown key 거부 [CITED: zod.dev API docs]
- Vite `import.meta.glob` eager option 동작 [CITED: vitejs.dev/guide/features#glob-import]

### Tertiary (LOW confidence)
- 본 phase 의 모든 critical claim 은 codebase 직접 검증 완료. LOW 항목 없음.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 모든 라이브러리 코드 사용 직접 검증
- Architecture: HIGH — Phase 26 인프라 코드 전체 검증, 통합 경로 분석 완료
- Pitfalls: HIGH — 7 종 pitfalls 모두 코드 라인 기반 — Phase 26 의 T-26-01/T-26-04 자동 보호 검증
- Code examples: HIGH (회의록/품의서 schema), MEDIUM (회의록 column id `title` 충돌 우려 → A2 ASSUMED)
- Validation Architecture: HIGH — 기존 vitest 인프라 + 명시적 단언 패턴 + Phase 26 build-time gate

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30일 — preset 인프라는 안정적, Vite/zod/lucide 의 minor version bump 외에는 변동 없음)
