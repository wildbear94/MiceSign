# Phase 32: CUSTOM 프리셋 확장 - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

v1.1 Phase 26 에서 구축한 preset 인프라 (`frontend/src/features/admin/presets/*.json` + auto-glob loader + `templateImportSchema` Zod 검증 + `PresetGallery` 컴포넌트) 위에 **회의록 (meeting) + 품의서 (proposal) 2종 JSON 프리셋만 추가**한다. 신규 컴포넌트·신규 필드 타입·신규 빌드 파이프라인 무. UI 컴포넌트 (`PresetGallery.tsx`, `TemplateFormModal`, `DynamicCustomForm`) 와 schema_definition_snapshot 불변성 인프라 모두 v1.1 자산 재활용.

requirements: FORM-01 (회의록), FORM-02 (품의서)

scope-out: 새로운 field type 추가 / 새로운 conditional/calculation rule 패턴 / 첨부 필드 시스템 / multi-language i18n / preset 그룹화 UI / preset 정렬 UI 변경 / 6개 초과 preset 시 layout 재설계
</domain>

<decisions>
## Implementation Decisions

### A. 회의록 (meeting) 스키마

- **D-A1:** filename = `frontend/src/features/admin/presets/meeting.json` — preset key = `meeting` (filename stem). ICON_MAP / I18N_MAP key 동일 사용.
- **D-A2:** `prefix = 'MTG'` (3자, EXP/LV/PUR/TRP 패턴 일치).
- **D-A3:** `category = 'general'` — 기존 카테고리 (finance/hr/general) 재사용. 신규 category 키 도입 안 함.
- **D-A4:** `icon = 'Users'` (lucide-react). PresetGallery `ICON_MAP['meeting'] = Users` 추가.
- **D-A5:** 필드 구성 (5개 + title 1개 + 회의일시 1개 = 총 4개 카드 + 파생 fields):
  - `id='title'`, `type='text'`, `required=true` — 제목 (모든 preset 의 표준 선행 필드)
  - `id='meetingDate'`, `type='date'`, `required=true` — 회의 일시 (date 단일 필드, 시간/시작-종료 별도 분기 안 함)
  - `id='attendees'`, `type='table'`, `required=true`, columns = `[name(text required), affiliation(text required), role(text)]`, `minRows=1`, `maxRows=20` — 참석자
  - `id='agenda'`, `type='table'`, `required=true`, columns = `[number(number required), title(text required), description(textarea)]`, `minRows=1`, `maxRows=20` — 안건
  - `id='decisions'`, `type='table'`, `required=true`, columns = `[topic(text required), decision(text required), owner(text), dueDate(date)]`, `minRows=1`, `maxRows=20` — 결정사항
- **D-A6:** `conditionalRules = []`, `calculationRules = []` — 회의록은 record-keeping. 자동 계산/조건부 노출 패턴 미사용. (expense/purchase 의 calculationRule, leave 의 conditionalRule 와 의도적 차별화.)

### B. 품의서 (proposal) 스키마

- **D-B1:** filename = `frontend/src/features/admin/presets/proposal.json` — key = `proposal`.
- **D-B2:** `prefix = 'PRP'` (3자).
- **D-B3:** `category = 'general'`.
- **D-B4:** `icon = 'FileSignature'` (lucide-react). `ICON_MAP['proposal'] = FileSignature`.
- **D-B5:** 필드 구성 (4개):
  - `id='title'`, `type='text'`, `required=true` — 제목
  - `id='background'`, `type='textarea'`, `required=true`, `config.maxLength=2000` — 품의 배경
  - `id='proposal'`, `type='textarea'`, `required=true`, `config.maxLength=2000` — 제안 내용
  - `id='expectedEffect'`, `type='textarea'`, `required=true`, `config.maxLength=2000` — 예상 효과 (정성적 단일 textarea, table/수치 병행 미사용)
- **D-B6:** **첨부는 schema field 미포함** — MiceSign 의 `document_attachment` 테이블 + Google Drive 업로드가 문서-차원에서 이미 첨부 처리. 사용자가 문서 작성 화면의 "파일 첨부" UI 로 제출. 관심사 분리 (preset = form structure / attachment = document-level).
- **D-B7:** `conditionalRules = []`, `calculationRules = []` — 정성적 의사결정 문서. 수치 자동 계산 미사용.

### C. PresetGallery 통합 (코드 변경)

- **D-C1:** `PresetGallery.tsx` `ICON_MAP` 에 2개 추가: `meeting: Users`, `proposal: FileSignature`. 기존 `ICON_MAP` 4개 (expense/leave/trip/purchase) preserve.
- **D-C2:** `PresetGallery.tsx` `I18N_MAP` 에 2개 추가: `meeting: { nameKey: 'templates.presetMeetingName', descKey: 'templates.presetMeetingDesc' }`, `proposal: { nameKey: 'templates.presetProposalName', descKey: 'templates.presetProposalDesc' }`. 기존 4개 preserve.
- **D-C3:** **PresetGallery grid 레이아웃 무수정** — `grid-cols-2` 그대로. 6개 → 3행 × 2열. modal `max-h-80vh` + `overflow-y-auto` 가 이미 스크롤 처리. 7개 이상 시 재고 (Deferred).
- **D-C4:** **`presets/index.ts` 의 sort 로직 무수정** — `sort((a, b) => a.key.localeCompare(b.key))` 그대로. 6개 정렬 결과: expense → leave → meeting → proposal → purchase → trip. JSON sortOrder 필드 도입 안 함.
- **D-C5:** preset 표시 명 SoT = **i18n 우선, JSON `name` fallback** — PresetGallery L94-96 패턴 유지. ko/admin.json 에 `presetMeetingName`/`Desc`, `presetProposalName`/`Desc` 4 신규 키 추가. JSON 의 `name="회의록"` / `name="품의서"` 는 fallback 으로 보존 (i18n 미로드 시 또는 export/import 경로용).

### D. 검증 / 테스트

- **D-D1:** `presets/presets.test.ts` 명시적 업데이트:
  - `length === 4` → `length === 6`
  - `keys === ['expense','leave','purchase','trip']` → `keys === ['expense','leave','meeting','proposal','purchase','trip']`
  - 기존 expense calculationRule / leave conditionalRule 단언 preserve
  - 신규 단언: `meeting preset has 5 fields` (title, meetingDate, attendees, agenda, decisions), `proposal preset has 4 fields` (title, background, proposal, expectedEffect)
- **D-D2:** **Snapshot 불변성 명시적 추가 검증 없음** — Phase 26 Plan 01 의 `templateImportSchema` 가 빌드 시점 자동 검증 (preset 손상 시 즉시 throw, T-26-04 mitigation 재사용). 또한 `approval_template.schema_definition_snapshot` (V8) + `template_schema_version` 테이블 (V9) 가 이미 문서별 schema snapshot 보장 — 신규 preset JSON 추가는 기존 row 무수정 (mutation 경로 부재). v1.1 인프라 신뢰.
- **D-D3:** **DynamicCustomForm 렌더 테스트는 v1.1 카운트 만 강제** — meeting/proposal 별도 렌더 unit test 추가 안 함. v1.1 의 DynamicCustomForm.test.tsx (또는 동등 파일) 가 모든 field type (text/textarea/number/date/select/table/staticText/hidden) 을 이미 커버 → meeting/proposal 의 새로운 field type 미도입으로 회귀 위험 0. 휴먼 UAT 로 시각 확인.

### E. i18n 추가 (ko/admin.json templates 섹션)

- **D-E1:** 신규 4 키 (한국어만 — PROJECT.md "한국어 documentation" 정책):
  - `presetMeetingName: "회의록"`
  - `presetMeetingDesc: "회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다"` (간결, 다른 preset description 길이 일치)
  - `presetProposalName: "품의서"`
  - `presetProposalDesc: "품의 배경·제안 내용·예상 효과를 정리합니다"`
- **D-E2:** en/admin.json 에는 추가 안 함 — v1.1 까지 한국어 only 정책. 영어 i18n 추가는 별도 milestone.

### Claude's Discretion

- 회의록 JSON 의 `description` 필드 (preset 자체 description, JSON 안에 들어감) 문구는 i18n key 와 자연스럽게 일치하되 약간 다를 수 있음 (export 시 사용자가 i18n 없이 보는 fallback). Planner 가 자연어 검토 후 결정.
- 회의록의 `attendees` table 의 `affiliation` (소속) 컬럼 placeholder 문구는 "예: 개발팀, 영업팀" 같은 안내 추가 가능 (선택적, UX 개선).
- 품의서 textarea placeholder 문구 — "예: 현재 시스템의 한계와 개선 필요성을 기술" 같은 가이드 텍스트 추가 가능 (선택적).

### Folded Todos

(없음 — `todo.match-phase 32` 결과 매칭 없음.)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 26 (preset 인프라 — 직접 의존)

- `frontend/src/features/admin/presets/index.ts` — Vite eager glob loader + Zod build-time validation. 회의록/품의서 JSON 추가 시 자동 인식.
- `frontend/src/features/admin/presets/expense.json` — calculationRule 패턴 참조 (회의록은 미사용이지만 schema 형식 reference).
- `frontend/src/features/admin/presets/leave.json` — conditionalRule + select options 패턴 참조 (회의록 미사용이나 form types).
- `frontend/src/features/admin/presets/purchase.json` — table multi-row + minRows/maxRows 패턴 참조 (회의록의 attendees/agenda/decisions table 와 직접 비교).
- `frontend/src/features/admin/presets/trip.json` — single-date + textarea 조합 패턴 참조.
- `frontend/src/features/admin/validations/templateImportSchema.ts` — `.strict()` Zod schema, fieldTypeSchema enum, columnConfigSchema, fieldConfigSchema. JSON 가 통과해야 함.
- `frontend/src/features/admin/components/PresetGallery.tsx` — ICON_MAP / I18N_MAP / grid layout. 신규 키 2개 추가 지점.
- `frontend/src/features/admin/components/TemplateFormModal.tsx` — preset 선택 후 호출되는 modal (수정 안 함).
- `frontend/src/features/admin/pages/TemplateListPage.tsx` — `createFlow.kind='preset'` → `handlePresetSelected` 흐름 (수정 안 함, 단지 흐름 이해 위해 read).
- `frontend/src/features/admin/presets/presets.test.ts` — length/keys 단언 업데이트 지점.

### v1.1 milestone artifact

- `.planning/phases/26-편의-기능/` (또는 v1.1 archive) — Phase 26 의 최종 SUMMARY (preset 자동-glob 결정 D-12~D-15, T-26-01 prototype pollution mitigation, T-26-04 preset corruption fail-fast)
- `frontend/src/features/document/components/DynamicCustomForm.tsx` — preset 으로 생성된 양식이 사용자 기안 화면에서 렌더되는 컴포넌트 (수정 안 함, render 호환성만 확인).

### Schema snapshot 인프라 (검증 책임 분리)

- `backend/src/main/resources/db/migration/V8__add_template_schema_support.sql` — `approval_template.schema_definition` + `schema_definition_snapshot` 컬럼.
- `backend/src/main/resources/db/migration/V9__create_template_schema_version.sql` — `template_schema_version` 테이블.
- `backend/src/main/java/com/micesign/domain/ApprovalTemplate.java` — `schemaDefinition` 필드 + getter/setter.

### i18n

- `frontend/public/locales/ko/admin.json` — `templates.preset*Name/Desc` 키 추가 지점. en/admin.json 추가 안 함 (한국어 only 정책).

### 요구사항 traceability

- `.planning/REQUIREMENTS.md` — FORM-01 / FORM-02 정의.
- `docs/PRD_MiceSign_v2.0.md` (해당 시) — CUSTOM 양식 빌더 요구.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`presets/index.ts`**: `import.meta.glob('./*.json', { eager: true })` 가 모든 JSON 자동 인식 + `templateImportSchema.parse(mod.default)` 빌드 시점 검증. 새 JSON 2개 드롭 시 추가 코드 없이 자동 등록.
- **`PresetGallery.tsx`**: 6 preset 까지 grid-cols-2 + max-h-80vh + overflow-y-auto 로 시각적 무리 없음. ICON_MAP / I18N_MAP 만 2 entry 추가.
- **`templateImportSchema`**: `.strict()` 정책으로 알 수 없는 키 거부 (`__proto__`, `constructor` 차단 — T-26-01). 신규 preset JSON 도 동일 보호.
- **`document_attachment` 테이블 + Google Drive 업로드**: 첨부 처리 인프라 — 품의서 schema 에 첨부 필드 미포함 정책 가능 (D-B6).

### Established Patterns

- **filename stem = preset key**: `expense.json` → key `expense`. ICON_MAP / I18N_MAP 키 일치. 회의록 = `meeting`, 품의서 = `proposal`.
- **prefix = 3자 영문**: EXP, LV, TRP, PUR. 신규: MTG, PRP.
- **category = 'finance' | 'hr' | 'general'**: 새 카테고리 도입 안 함, 둘 다 'general'.
- **table columns 의 strict() Zod 검증**: column 단계도 `.strict()` 으로 unknown key 거부 (templateImportSchema L34-49).
- **JSON name + i18n 이중 적재**: PresetGallery 가 i18n key 우선, fallback JSON name. 양쪽 모두 채움 (export/import 호환).
- **테스트 명시적 단언**: `length === N` + `keys === [...]` 강한 단언. 새 preset 추가 시 명시적 업데이트 (의도된 게이트).
- **prefix 강제 공란 (D-10 from Phase 26)**: TemplateListPage `importToInitialValues` 에서 `prefix: ''` 로 reset. 사용자가 신규 prefix 입력 (회의록/품의서 prefix 는 JSON 의 default 임).
- **conditionalRule/calculationRule 빈 배열 허용**: 회의록/품의서 모두 빈 배열 — schemaDefinition 의 optional 필드.

### Integration Points

- **`TemplateListPage` createFlow state machine** (D-16/D-17 from Phase 26): preset 선택 → form modal. 본 phase 무수정 — preset key 만 늘어남.
- **`DynamicCustomForm`**: preset 으로 생성된 template 으로 사용자 기안 시 렌더. text/textarea/number/date/select/table 모두 이미 지원 — 회의록/품의서 모두 기존 field type 만 사용 → 회귀 위험 0.
- **i18n `react-i18next`**: PresetGallery 의 `useTranslation('admin')` 가 ko/admin.json 의 `templates` namespace 읽음. 신규 4 키 추가만 하면 PresetGallery 가 자동 표시.
- **`approval_template.schema_definition_snapshot`**: 사용자가 양식을 저장하는 시점에 schema snapshot 이 row 단위로 적재됨. 이후 preset JSON 변경/추가 무관. 과거 문서 불변성 자동 보장.
</code_context>

<specifics>
## Specific Ideas

- 회의록 attendees table 의 columns 순서: `이름 → 소속 → 역할`. `역할` 은 optional (회의에서 공식 역할이 없는 경우 비워둠).
- 회의록 agenda table 의 `number` 컬럼: 자동 채번 안 함 (사용자 입력). 필요 시 향후 calculationRule 로 자동 채번 추가 고려 (Deferred).
- 회의록 decisions table 의 `dueDate` (기한) 컬럼: optional. 정보성 결정 (e.g., "공지 사항만 전달") 에는 비워둠 가능.
- 품의서 expectedEffect 는 단일 textarea — 향후 정량 측정이 필요한 의사결정 (예산 결재 등) 은 별도 preset (e.g., budget-proposal.json) 로 분리 가능 (Deferred, v1.3+).
</specifics>

<deferred>
## Deferred Ideas

- **품의서 정량 효과 expansion**: expectedEffect 를 table[효과항목/금액/설명] 으로 변경 + estimatedBenefit calculationRule. 정성/정량 trade-off 학습 후 v1.3+ 에서 budget-proposal preset 신설.
- **PresetGallery 7개 이상 시 grid-cols-3 upgrade**: 현재 6개 grid-cols-2 (3행) 시각적 무리 없음. 7개 이상 추가 시 lg:grid-cols-3 도입.
- **JSON sortOrder 필드 도입**: localeCompare 가 자연스러운 한국어 정렬 아님 (alphabet-based). UX 우선 시 sortOrder 도입 — 현재는 over-spec.
- **i18n 영어 다국어 지원**: en/admin.json `presetXxxName/Desc` 키 추가. v1.1 까지 한국어 only 정책 — 별도 milestone.
- **회의록 agenda number 자동 채번**: calculationRule 또는 frontend logic 으로 row index 자동 입력. v1.3+.
- **preset category 필터링/그룹화 UI**: PresetGallery 에 카테고리별 탭 또는 sticky header. 6 preset 수준에서는 over-engineering.
- **회의 종류 select + conditionalRule (정기/임시/프로젝트)**: 본 phase 에서 conditionalRule 미도입. 분기 필요 시 v1.3+ 또는 별도 preset.
- **회의록 시작/종료 시간 + 소요시간 calculationRule**: D-A5 에서 date 단일 결정. 시간대 필요 시 v1.3+.
- **Backend integration test (preset → 양식 → 문서 → 렌더 회귀)**: D-D2 / D-D3 에서 over-spec 판정. v1.1 인프라 신뢰. v1.2 milestone audit (Phase 33) 또는 별도 hardening 에서 재고.
</deferred>

---

*Phase: 32-custom*
*Context gathered: 2026-04-25*
