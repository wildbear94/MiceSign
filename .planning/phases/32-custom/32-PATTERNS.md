# Phase 32: CUSTOM 프리셋 확장 - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 5 (신규 2, 수정 3)
**Analogs found:** 5 / 5 (전부 exact match — 본 phase 는 데이터 확장)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/features/admin/presets/meeting.json` (신규) | preset data (build-time JSON asset) | build-time loader → Zod validate → glob register → React render | `frontend/src/features/admin/presets/purchase.json` | exact (table multi-row, minRows/maxRows) |
| `frontend/src/features/admin/presets/proposal.json` (신규) | preset data (build-time JSON asset) | build-time loader → Zod validate → glob register → React render | `frontend/src/features/admin/presets/leave.json` (textarea + config.placeholder) + `expense.json` (`title` 필드 위치) | exact (textarea heavy, config.maxLength) |
| `frontend/src/features/admin/components/PresetGallery.tsx` (수정) | UI component (admin React) | runtime: presets[] → ICON_MAP/I18N_MAP lookup → grid card render | 자기 자신 (L4-11 import block + L28-41 ICON_MAP/I18N_MAP) | self-extension |
| `frontend/public/locales/ko/admin.json` (수정) | i18n resource (build/runtime asset) | runtime: react-i18next → `t('templates.presetXxxName')` lookup | 자기 자신 (L136-143 templates.preset* 4 키) | self-extension |
| `frontend/src/features/admin/presets/presets.test.ts` (수정) | test (vitest unit) | CI/build-time gate: import presets → length/keys/safeParse 단언 | 자기 자신 (L6-13 length/keys 단언, L25-39 preset-specific 단언) | self-extension |

## Pattern Assignments

### `frontend/src/features/admin/presets/meeting.json` (preset data, build-time JSON)

**Analog:** `frontend/src/features/admin/presets/purchase.json` (다중 table 필드 + minRows/maxRows + general/finance category prefix 패턴)

**Top-level envelope pattern** (purchase.json L1-9):
```json
{
  "exportFormatVersion": 1,
  "schemaVersion": 1,
  "name": "구매신청서",
  "description": "품목 테이블과 총액 자동 계산을 포함합니다",
  "prefix": "PUR",
  "category": "finance",
  "icon": "ShoppingCart",
  "schemaDefinition": { ... }
}
```
회의록 적용: `name="회의록"`, `description="회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다"`, `prefix="MTG"`, `category="general"`, `icon="Users"`. envelope 키 순서/형식 그대로 복사.

**Title-first 필드 시작 패턴** (purchase.json L12 / expense.json L12):
```json
{ "id": "title", "type": "text", "label": "구매 제목", "required": true },
```
회의록 적용: 첫 field `{ "id": "title", "type": "text", "label": "제목", "required": true }`. `required: true` 필수 (templateImportSchema.ts L81 `required: z.boolean()` non-optional).

**Single-date 필드 패턴** (trip.json L13-14, leave.json L26-27):
```json
{ "id": "startDate", "type": "date", "label": "출발일", "required": true },
```
회의록 적용: `{ "id": "meetingDate", "type": "date", "label": "회의 일시", "required": true }`.

**Table 필드 + columns + minRows/maxRows 패턴** (purchase.json L14-29 + expense.json L13-28 의 `maxRows: 20`):
```json
{
  "id": "items",
  "type": "table",
  "label": "품목",
  "required": true,
  "config": {
    "columns": [
      { "id": "name", "type": "text", "label": "품명", "required": true },
      { "id": "spec", "type": "text", "label": "규격" },
      { "id": "quantity", "type": "number", "label": "수량", "required": true },
      { "id": "unitPrice", "type": "number", "label": "단가", "required": true },
      { "id": "amount", "type": "number", "label": "금액" }
    ],
    "minRows": 1
  }
}
```
회의록 적용: 동일 구조로 attendees / agenda / decisions 3 개 table. column 의 `required` 는 optional (templateImportSchema.ts L55) — 필수 컬럼만 `required: true` 명시. `minRows: 1, maxRows: 20` 둘 다 명시 (D-A5).

**Column placeholder 패턴** (leave.json L33 의 field-level config.placeholder 와 동일 형식 — column-level 도 columnConfigSchema.ts L37 가 `placeholder: z.string().optional()` 허용):
```json
{ "id": "affiliation", "type": "text", "label": "소속", "required": true,
  "config": { "placeholder": "예: 개발팀" } }
```
회의록 attendees.affiliation 컬럼에 적용 (Discretion, CONTEXT 영역).

**Empty rules 패턴** (expense.json L39 — conditionalRules 만 빈 배열, calculationRules 만 채움. 반대로 leave.json L37-48 은 conditionalRules 만, calculationRules 빈 배열):
```json
"conditionalRules": [],
"calculationRules": []
```
회의록 적용: 둘 다 빈 배열 (D-A6 — record-keeping, 자동 분기/계산 미사용).

---

### `frontend/src/features/admin/presets/proposal.json` (preset data, build-time JSON)

**Analog:** `frontend/src/features/admin/presets/leave.json` (textarea + config.placeholder + 빈 calculationRules) + `frontend/src/features/admin/presets/expense.json` (title field, finance/general category)

**Envelope 패턴** (purchase.json L1-9 와 동일 구조):
적용: `name="품의서"`, `description="품의 배경·제안 내용·예상 효과를 정리합니다"`, `prefix="PRP"`, `category="general"`, `icon="FileSignature"`.

**Textarea + config.placeholder 패턴** (leave.json L28-34):
```json
{
  "id": "sickReason",
  "type": "textarea",
  "label": "병가 사유",
  "required": false,
  "config": { "placeholder": "병가 관련 상세 사유를 입력하세요" }
}
```
품의서 적용: background / proposal / expectedEffect 3 개 textarea. 단, `required: true` + `config.maxLength: 2000` 추가 (D-B5). 합쳐진 형태:
```json
{
  "id": "background",
  "type": "textarea",
  "label": "품의 배경",
  "required": true,
  "config": { "maxLength": 2000, "placeholder": "예: 현재 시스템의 한계와 개선 필요성을 기술" }
}
```
`maxLength` 키는 templateImportSchema.ts L63 `maxLength: z.number().int().nonnegative().optional()` 가 허용 — camelCase 정확 일치 필수.

**No-rules 패턴** (expense.json L39 / trip.json L38 의 빈 conditionalRules — 반대로 calculationRules 도 빈 배열):
적용: 둘 다 `[]` (D-B7 — 정성적 의사결정 문서, 자동 계산/분기 부재).

---

### `frontend/src/features/admin/components/PresetGallery.tsx` (UI component, self-extension)

**Analog:** 자기 자신 (PresetGallery.tsx)

**Import block 패턴** (PresetGallery.tsx L3-11):
```typescript
import {
  X,
  Receipt,
  CalendarDays,
  Plane,
  ShoppingCart,
  LayoutTemplate,
  type LucideIcon,
} from 'lucide-react';
```
적용: alphabetical 또는 use-order 그대로 두고 ShoppingCart 다음에 `Users,` 추가, LayoutTemplate 직전에 `FileSignature,` 추가. `type LucideIcon` 마지막 줄 preserve.

**ICON_MAP 확장 패턴** (PresetGallery.tsx L28-33):
```typescript
const ICON_MAP: Record<string, LucideIcon> = {
  expense: Receipt,
  leave: CalendarDays,
  trip: Plane,
  purchase: ShoppingCart,
};
```
적용: 기존 4 entry preserve, 끝에 2 entry 추가. preset key (filename stem) → lucide LucideIcon 매핑. 정렬 순서는 코드 가독성 (declaration order) 유지 — 런타임에는 `presets/index.ts` L30 `localeCompare` 가 자동 정렬.
```typescript
const ICON_MAP: Record<string, LucideIcon> = {
  expense: Receipt,
  leave: CalendarDays,
  trip: Plane,
  purchase: ShoppingCart,
  meeting: Users,            // NEW
  proposal: FileSignature,   // NEW
};
```

**I18N_MAP 확장 패턴** (PresetGallery.tsx L36-41):
```typescript
const I18N_MAP: Record<string, { nameKey: string; descKey: string }> = {
  expense: { nameKey: 'templates.presetExpenseName', descKey: 'templates.presetExpenseDesc' },
  leave: { nameKey: 'templates.presetLeaveName', descKey: 'templates.presetLeaveDesc' },
  trip: { nameKey: 'templates.presetTripName', descKey: 'templates.presetTripDesc' },
  purchase: { nameKey: 'templates.presetPurchaseName', descKey: 'templates.presetPurchaseDesc' },
};
```
적용: 키 명명 규약 = `templates.preset{PascalCaseKey}Name` / `Desc`. meeting → `presetMeetingName`/`presetMeetingDesc`, proposal → `presetProposalName`/`presetProposalDesc`.

**Fallback chain 패턴 — 변경 없음** (PresetGallery.tsx L92-98):
```typescript
const Icon = ICON_MAP[preset.key] ?? LayoutTemplate;
const i18n = I18N_MAP[preset.key];
const displayName = i18n ? t(i18n.nameKey) : preset.data.name;
const displayDesc = i18n ? t(i18n.descKey) : preset.data.description ?? '';
```
신규 entry 추가만으로 자동 통합. 코드 수정 없음.

**Grid layout — 변경 금지** (PresetGallery.tsx L91 `grid grid-cols-2 gap-4`, L75 `max-w-3xl max-h-[80vh]`, L90 `overflow-y-auto max-h-[70vh]`):
6 카드 → 3행 × 2열, modal 자체 스크롤. CONTEXT D-C3 / Anti-Pattern 명시.

---

### `frontend/public/locales/ko/admin.json` (i18n resource, self-extension)

**Analog:** 자기 자신 (templates 섹션 L100-300, 특히 preset 4 키 L136-143)

**Preset i18n 키 패턴** (admin.json L136-143):
```json
"presetExpenseName": "경비신청서",
"presetExpenseDesc": "항목/단가/수량/합계 테이블과 자동 합계 계산을 포함합니다",
"presetLeaveName": "휴가신청서",
"presetLeaveDesc": "휴가 종류 선택과 기간별 조건부 사유 입력을 포함합니다",
"presetTripName": "출장신청서",
"presetTripDesc": "일정·동행자·예상 비용 계산을 포함합니다",
"presetPurchaseName": "구매신청서",
"presetPurchaseDesc": "품목 테이블과 총액 자동 계산을 포함합니다",
```
적용 위치: L143 (`presetPurchaseDesc` 줄) 다음에 4 키 추가. trailing 콤마 처리 주의 — `presetPurchaseDesc` 다음 줄 콤마 추가 + 신규 4 키 끝 (presetProposalDesc) 은 다음 키 (`importTitle` L144) 와 콤마 연결.
```json
"presetMeetingName": "회의록",
"presetMeetingDesc": "회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다",
"presetProposalName": "품의서",
"presetProposalDesc": "품의 배경·제안 내용·예상 효과를 정리합니다",
```
**문구 일관성 패턴:**
- Name: `OO신청서` 또는 단일명사 (회의록/품의서) — preset 의 자연 한국어 명칭.
- Desc: `~를 포함합니다` / `~합니다` 능동 종결, 12-30 자 범위, `·` 중점으로 키워드 나열 (purchase 의 "품목 테이블과 총액 자동 계산을 포함합니다" 패턴).

**en/admin.json 수정 금지** (D-E2 — 한국어 only 정책, CLAUDE.md 의 "한국어 documentation" 일치).

---

### `frontend/src/features/admin/presets/presets.test.ts` (test, self-extension)

**Analog:** 자기 자신 (presets.test.ts 전체)

**Length 단언 업데이트 패턴** (presets.test.ts L6-8):
```typescript
it('contains exactly 4 presets', () => {
  expect(presets).toHaveLength(4);
});
```
적용: `4` → `6`, 설명 문자열 `'contains exactly 4 presets'` → `'contains exactly 6 presets'`.

**Keys 단언 업데이트 패턴** (presets.test.ts L10-13):
```typescript
it('has expected keys', () => {
  const keys = presets.map((p) => p.key).sort();
  expect(keys).toEqual(['expense', 'leave', 'purchase', 'trip']);
});
```
적용: `localeCompare` 정렬 결과 = `['expense', 'leave', 'meeting', 'proposal', 'purchase', 'trip']` (alphabetical, presets/index.ts L30 sort 순서와 일치).

**Preset-specific 단언 보존 + 신규 추가 패턴** (presets.test.ts L25-39):
```typescript
it('expense preset has at least one calculationRule', () => {
  const expense = presets.find((p) => p.key === 'expense')!;
  expect(expense.data.schemaDefinition.calculationRules?.length ?? 0).toBeGreaterThanOrEqual(1);
});

it('leave preset has at least one conditionalRule', () => { ... });

it('purchase preset has at least one table field', () => {
  const purchase = presets.find((p) => p.key === 'purchase')!;
  const hasTable = purchase.data.schemaDefinition.fields.some((f) => f.type === 'table');
  expect(hasTable).toBe(true);
});
```
**기존 3 단언 모두 preserve.** 신규 2 단언을 동일 패턴으로 추가:
```typescript
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
```
`presets.find(...)!` non-null assertion + `expect(field).toHaveLength(N)` + ids 추출 → toEqual 패턴이 기존 단언과 100% 일치.

**Cross-cutting 단언 — 변경 없음** (presets.test.ts L15-23, L41-45):
- `each preset passes templateImportSchema` (L15-23) — 신규 2 preset 자동 포함 (presets[] 순회).
- `all preset names are Korean` (L41-45) — 회의록/품의서 모두 한글 → 자동 통과.

---

## Shared Patterns

### Pattern S1: Preset key / filename stem / ICON_MAP key / I18N_MAP key 동일 사용
**Source:** `presets/index.ts` L26 (`key = path.replace(/^\.\/(.*)\.json$/, '$1')`) + `PresetGallery.tsx` L92 (`presets.map((preset) => { const Icon = ICON_MAP[preset.key] ...`)
**Apply to:** meeting.json + proposal.json — filename stem 이 곧 PresetGallery 의 lookup 키.
**Constraint:** filename = `meeting.json` → key = `'meeting'` → ICON_MAP/I18N_MAP 둘 다 `meeting` (lowercase) 사용. PascalCase / snake_case 변환 금지.

### Pattern S2: Build-time fail-fast Zod validation (T-26-04)
**Source:** `presets/index.ts` L27 (`templateImportSchema.parse(mod.default)`)
**Apply to:** 신규 JSON 2 개 — 작성 후 `npm run build` 또는 `npm run test -- presets` 실행으로 즉시 검증.
**Strict 키 보호:** `templateImportSchema` (L128) + `fieldConfigSchema` (L74) + `columnConfigSchema` (L48) + `fieldDefinitionSchema` (L84) + `columnSchema` (L58) 모두 `.strict()`. 알려지지 않은 키 (오타 `placeHolder`, `__proto__`) 즉시 ZodError throw.
```typescript
// templateImportSchema.ts L74 (T-26-01 mitigation)
.strict(); // T-26-01: reject unknown keys incl. __proto__
```

### Pattern S3: Required boolean — non-optional on field, optional on column
**Source:** `templateImportSchema.ts` L81 (`required: z.boolean()`) vs L55 (`required: z.boolean().optional()`)
**Apply to:** 모든 신규 field 의 `required` 명시 필수 (true/false). column 의 `required` 는 필수 컬럼만 `true` 명시, optional 컬럼은 키 자체 생략 허용.
**Pitfall:** field 에서 `required` 누락 시 → `ZodError: Required at fields.0.required`.

### Pattern S4: Korean-only i18n + JSON name fallback
**Source:** `PresetGallery.tsx` L95-98 (i18n 우선 + JSON name fallback) + CLAUDE.md ("한국어 documentation")
**Apply to:** ko/admin.json 신규 4 키만 추가, en/admin.json 추가 금지. JSON 의 `name="회의록"` / `name="품의서"` 는 export/import 호환 + i18n 미로드 fallback.

### Pattern S5: Test 명시적 게이트 (의도된 friction)
**Source:** `presets.test.ts` L7 (`toHaveLength(4)`) + L12 (`toEqual([...])`) + Phase 26 D-D1 결정
**Apply to:** 신규 preset 추가 시 length/keys 단언 명시적 업데이트 — 무의식 추가 방지. Phase 32 의 "wave 0 gap" 핵심 (RESEARCH.md L676-679).

### Pattern S6: prefix 강제 reset (사용자 입력 의무)
**Source:** `TemplateListPage.tsx` `importToInitialValues` — `prefix: ''` 강제 (Phase 26 D-10, RESEARCH.md Pitfall 8)
**Apply to:** meeting.json `prefix="MTG"` / proposal.json `prefix="PRP"` 는 export/import fallback + 문서화 가치만 가짐. 사용자 양식 생성 화면에서는 빈 입력란 표시 — JSON prefix 자동 적용 안 됨.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (없음) | — | — | 본 phase 의 모든 신규/수정 파일이 v1.1 Phase 26 인프라의 동일 패턴 직접 확장 — 100% analog 커버. |

## Discretion Discrepancy 검증 노트

### 회의록 agenda 컬럼 id `title` 충돌 우려 (RESEARCH.md A2, Open Question 1)
- **Analog 패턴:** root field id 와 column id 가 같은 namespace 충돌 사례는 기존 4 preset 에서 미발생 (purchase: items 안 `name`/`spec`/`quantity`/`unitPrice`/`amount` ≠ root `title`/`vendor`/`reason`).
- **권장 패턴:** **column id `title` → `subject` 변경** (안전 마진). DynamicTableField 가 `${field.id}.${rowIdx}.${col.id}` namespace 처리하므로 react-hook-form path 충돌은 이론상 없으나, 명시적 분리가 미래 calculationRule (e.g., `agenda.title` 참조) 도입 시 모호성 차단.
- **Planner 결정 권장:** Plan 01 (meeting.json) 작성 시 user 와 확인 후 결정. CONTEXT D-A5 가 `title(text required)` 명시 → Discretion 으로 변경 가능 영역.

### lucide-react `FileSignature` export 가용성 (RESEARCH.md Open Question 2)
- **Analog 검증:** PresetGallery.tsx L4-11 의 `Receipt`, `CalendarDays`, `Plane`, `ShoppingCart`, `X`, `LayoutTemplate` 모두 lucide-react 표준 export.
- **권장 검증:** Plan 03 첫 단계에 `cd frontend && npx tsc --noEmit` 또는 dev server 실행으로 import 가용성 확인. 만약 미존재 시 `FilePenLine` 또는 `ClipboardCheck` fallback (PresetGallery `ICON_MAP['proposal']` 만 변경, JSON `icon` 필드는 보존 또는 동기 변경).

## Metadata

**Analog search scope:**
- `frontend/src/features/admin/presets/*.json` (4 파일 전부 — expense, leave, purchase, trip)
- `frontend/src/features/admin/presets/index.ts` (loader)
- `frontend/src/features/admin/presets/presets.test.ts` (test)
- `frontend/src/features/admin/components/PresetGallery.tsx` (UI)
- `frontend/src/features/admin/validations/templateImportSchema.ts` (Zod schema)
- `frontend/public/locales/ko/admin.json` (i18n)

**Files scanned:** 9
**Pattern extraction date:** 2026-04-25
**Phase:** 32-custom

---

*PATTERNS.md generated for `/gsd-plan-phase` consumption — gsd-planner 가 plan 별 액션 섹션에서 직접 인용 가능.*
