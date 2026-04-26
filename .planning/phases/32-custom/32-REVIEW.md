---
phase: 32-custom
reviewed: 2026-04-25T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - frontend/public/locales/ko/admin.json
  - frontend/src/features/admin/components/PresetGallery.tsx
  - frontend/src/features/admin/presets/meeting.json
  - frontend/src/features/admin/presets/presets.test.ts
  - frontend/src/features/admin/presets/proposal.json
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-04-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 32(CUSTOM 프리셋 확장 — 회의록 / 품의서) 변경 5개 파일을 표준 깊이로 리뷰했습니다. Phase 26 의 `templateImportSchema.strict()` 와 새 JSON 두 개의 호환성, ICON_MAP/I18N_MAP 추가의 타입 안전성, ko/admin.json 의 키 보존, presets.test.ts 단언의 견고성, 한국어 명칭 일관성을 점검했습니다.

핵심 결과:
- Critical 없음. 보안/충돌/실패 위험은 발견되지 않았습니다.
- Phase 26 strict zod schema 와 신규 JSON 두 개는 **호환됩니다.** prototype pollution 표면도 노출되지 않습니다 (`.strict()` 가 모든 중첩 객체에 적용됨).
- meeting.json 5 fields / 3 tables 컬럼 ID 모두 column scope 내에서 unique, schema-level 충돌 없음. 다만 `agenda.title` 컬럼 ID 가 root field `title` 과 동일해 향후 calculation rule 추가 시 모호성 가능성 (Warning).
- proposal.json 의 textarea 3개는 모두 `maxLength: 2000` 으로 일관됩니다.
- ICON_MAP/I18N_MAP 의 4개 추가 항목(meeting/proposal — 실제로는 2개 신규 + 기존 4개 유지) 은 lucide-react `LucideIcon` 타입으로 안전하게 추론됩니다.
- ko/admin.json 은 유효한 JSON 이고 기존 키는 모두 보존되었습니다.
- presets.test.ts 단언은 견고하나 false-positive 위험 1건 (Warning) 과 약한 단언 다수 (Info) 가 있습니다.
- 한국어 명칭은 ko/admin.json `presetMeetingName/Desc`, `presetProposalName/Desc` 와 JSON `name`/`description` 이 정확히 일치합니다.

## Warnings

### WR-01: meeting.json — column id `title` 이 root field id `title` 과 충돌 가능

**File:** `frontend/src/features/admin/presets/meeting.json:43`
**Issue:** `agenda` 테이블의 컬럼 `{ "id": "title", "type": "text", "label": "안건명", "required": true }` 가 schema 의 root field `{ "id": "title", "type": "text", "label": "제목" }` (L12) 과 동일한 식별자입니다. `templateImportSchema` 는 column-scope 와 field-scope 를 분리해서 검증하므로 import 는 통과하지만, 향후 누군가 회의록에 calculationRule 또는 conditionalRule 을 추가하면서 `title` 을 참조할 경우 어느 scope 인지 모호해집니다. 또한 `agenda.title` 라는 dotted reference 도 expense.json `items.amount` 와 동일한 표기법이므로 디버깅·UI 라벨링이 혼란스러워질 수 있습니다.
**Fix:** column id 를 의미가 분명한 이름으로 변경하세요 (현재는 안건이므로 `topic` 또는 `subject` 권장 — `decisions` 컬럼의 `topic` 과도 어휘 정렬됨).
```json
// frontend/src/features/admin/presets/meeting.json L43
{ "id": "title", "type": "text", "label": "안건명", "required": true }
// → 변경
{ "id": "subject", "type": "text", "label": "안건명", "required": true }
```

### WR-02: presets.test.ts — “meeting preset has 5 fields” 단언이 fragile (regression early warning)

**File:** `frontend/src/features/admin/presets/presets.test.ts:48-53`
**Issue:** `expect(meeting.data.schemaDefinition.fields).toHaveLength(5)` 는 실제 JSON 의 정렬 순서에도 강하게 결합되어 있고(이어서 `toEqual(['title', 'meetingDate', 'attendees', 'agenda', 'decisions'])` 가 순서 의존), 향후 누군가 회의록에 `location`(개최 장소) 같은 한 줄 필드를 합당하게 추가하면 의도치 않은 실패를 일으킵니다. 동시에 5개 필드 ID 를 hard-code 하므로 실제 회귀(예: required→optional, table→text 변경)는 잡지 못합니다 — 즉 false-positive 와 false-negative 양쪽 위험이 있습니다.
**Fix:** "필수 필드가 모두 있는가" 형태로 풀어 작성하세요.
```ts
// 견고한 형태
const meeting = presets.find((p) => p.key === 'meeting')!;
const ids = new Set(meeting.data.schemaDefinition.fields.map((f) => f.id));
expect(ids).toEqual(new Set(['title', 'meetingDate', 'attendees', 'agenda', 'decisions']));
expect(meeting.data.schemaDefinition.fields.filter((f) => f.type === 'table')).toHaveLength(3);
// proposal 동일 패턴 — Set 비교 + textarea 개수 단언
```

## Info

### IN-01: presets.test.ts — “all preset names are Korean” 정규식이 한 글자만으로 통과

**File:** `frontend/src/features/admin/presets/presets.test.ts:62-66`
**Issue:** `/[가-힣]/` 는 한 글자 한글만 있어도 통과하므로 `"X회"` 같은 부분 한글 이름도 통과합니다. 단언은 통과 의미가 약합니다.
**Fix:** 더 구체화하거나(예: `name.length >= 2 && /^[가-힣\s·]+$/.test(name)`) 또는 정확한 화이트리스트 비교로 바꾸세요. 예: `expect(p.data.name).toBe(expectedNames[p.key])`.

### IN-02: presets.test.ts — preset 키 단언이 단순 정렬 비교 (정렬 의존)

**File:** `frontend/src/features/admin/presets/presets.test.ts:10-20`
**Issue:** `index.ts` 의 `localeCompare` 정렬에 강하게 결합됩니다. 추후 정렬 정책을 바꾸면(예: 카테고리 우선) 순서 단언이 깨집니다. 의미는 “6개가 빠짐없이 등록되었나” 인데 표현은 “정렬 결과가 정확히 이 배열인가”로 좁혀져 있습니다.
**Fix:** 순서 무관 비교로 바꾸세요.
```ts
expect(new Set(presets.map((p) => p.key)))
  .toEqual(new Set(['expense', 'leave', 'meeting', 'proposal', 'purchase', 'trip']));
```

### IN-03: PresetGallery.tsx — `LucideIcon` 타입 import 시 `type` modifier 누락 일관성 (코스메틱)

**File:** `frontend/src/features/admin/components/PresetGallery.tsx:3-13`
**Issue:** `import { ..., type LucideIcon } from 'lucide-react'` 는 동작하지만 verbatimModuleSyntax 가 켜진 프로젝트에서는 inline-type modifier 의 일관성이 중요합니다. 현재 파일은 `type LucideIcon` 만 type 으로 표시되어 있고, 다른 아이콘 import 는 value-side 입니다. 이는 lucide-react 의 type-only export 대상이 LucideIcon 뿐이라 의도된 형태입니다 (Confidence: 의도된 패턴). 후속 작업에서 추가 type-only export 를 import 할 일이 있으면 동일 형태를 따르세요.
**Fix:** 변경 불필요. (정보용으로 기록.)

### IN-04: meeting.json — agenda.number 컬럼이 number 타입이지만 “순서 번호” 의미면 자동 채번을 고려할 수 있음

**File:** `frontend/src/features/admin/presets/meeting.json:42`
**Issue:** `{ "id": "number", "type": "number", "label": "번호", "required": true }` 는 안건 “순번” 의미로 사용되지만 사용자가 매번 1, 2, 3 을 직접 타이핑해야 합니다. UX 면에서 row index 자동 채번 또는 `min: 1` 정도의 가드가 흔한 패턴입니다. 본 phase 의 schema 는 이를 지원하지 않으므로 변경 불필요하나, 사용자 피드백 시 회귀 포인트로 기록해 둘 가치가 있습니다.
**Fix:** 단기 수정은 불필요. 후속 phase 에서 `min: 1` 제약을 추가하거나 자동 채번 옵션을 컬럼 schema 에 도입할지 검토하세요.

### IN-05: ko/admin.json — `presetMeetingDesc` / `presetProposalDesc` 와 JSON `description` 의 이중 출처

**File:** `frontend/public/locales/ko/admin.json:144-147`
**Issue:** PresetGallery 는 `i18n` 키가 있으면 `t(i18n.descKey)` 를 우선 사용하고 fallback 으로 `preset.data.description` 을 사용합니다 (PresetGallery.tsx L102-104). 즉 동일 문자열이 두 군데(meeting.json L5, ko/admin.json L145) 에 중복 저장됩니다. 현재 둘은 정확히 일치하므로 즉시 문제는 없으나, 한쪽만 수정되면 i18n 우선 정책 때문에 JSON 의 `description` 은 사실상 dead-code 가 됩니다(다국어 추가 시까지). 이는 의도된 trade-off (i18n 분리 vs preset 자족성) 일 가능성이 높지만, 명시적 주석 또는 lint 규칙으로 sync 보장을 권장합니다.
**Fix:** 변경 불필요. 후속 작업에서 (1) preset.data.description 을 i18n key 로 통일하거나 (2) presets.test.ts 에 `expect(t('templates.presetMeetingDesc')).toBe(meeting.data.description)` 같은 sync 단언 추가를 검토하세요.

## 추가 검증 결과 (모두 PASS)

다음 검증 항목은 통과했으므로 finding 으로 등록하지 않았습니다.

- **Phase 26 zod schema 호환성 (CRITICAL 검증)**: `templateImportSchema.strict()` 는 envelope, `schemaDefinition`, `fieldDefinitionSchema`, `fieldConfigSchema`, `columnSchema`, `columnConfigSchema` 모두에 `.strict()` 가 적용되어 있어 unknown key (`__proto__`, `constructor`, `prototype` 포함) 거부. meeting.json / proposal.json 에는 추가 키가 없으므로 prototype pollution 표면 노출 없음. `presets/index.ts` 의 `templateImportSchema.parse(mod.default)` 가 build-time 에 두 JSON 을 검증하고 실패 시 즉시 throw 하므로 런타임 dead path 없음.
- **meeting.json field/column required 정책**: root field 5개 모두 `required: true` 명시 (zod schema 가 `required: z.boolean()` 으로 비-optional 이므로 필수). 모든 column 은 column scope 내에서 unique id 를 가짐 (attendees: name/affiliation/role; agenda: number/title/description; decisions: topic/decision/owner/dueDate).
- **proposal.json textarea maxLength 일관성**: background / proposal / expectedEffect 모두 `maxLength: 2000` 으로 동일. placeholder 도 모두 “예: …” 또는 명령형 단문으로 톤 일관됨.
- **PresetGallery ICON_MAP / I18N_MAP 타입 안전성**: 두 맵 모두 `Record<string, …>` 이므로 키 누락 시 TS 오류는 없으나 런타임 fallback (`?? LayoutTemplate` / `i18n ? … : preset.data.name`) 으로 안전하게 처리됨. lucide-react 의 `Users`, `FileSignature` 는 정식 export 이며 import 도 정상.
- **prefix 충돌**: 6개 preset prefix (EXP, MTG, PRP, LV, PUR, TRP) 모두 unique.
- **ko/admin.json JSON 유효성**: 373 라인, root object, 모든 키-값 유효. 신규 4개 키 (presetMeetingName/Desc, presetProposalName/Desc) 가 `templates` 블록 내 기존 4개 preset 키 바로 다음에 추가되어 일관성 유지. 기존 키 손상 없음 (sidebar.templates, common.\*, errors.\*, registration.\*, toast.\* 모두 보존).
- **한국어 명칭 일관성**: ko/admin.json `presetMeetingName="회의록"` ↔ meeting.json `name="회의록"` 일치. `presetMeetingDesc` 도 정확히 동일 문자열. proposal 측도 동일.
- **presets.test.ts 단언 9개 견고성**: 6개 length, 키 정합, schema parse, expense calc rule, leave conditional, purchase table, meeting/proposal 필드 — 의미 있는 회귀 게이트. 단 WR-02, IN-01, IN-02 의 제언 사항이 있음.

---

_Reviewed: 2026-04-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
