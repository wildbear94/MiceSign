---
phase: 32
status: all_in_scope_resolved
findings_in_scope: 7
fixed: 4
skipped: 3
iteration: 1
fixed_at: 2026-04-29T16:48:00Z
review_path: .planning/phases/32-custom/32-REVIEW.md
---

# Phase 32: Code Review Fix Report

**Fixed at:** 2026-04-29T16:48:00Z
**Source review:** `.planning/phases/32-custom/32-REVIEW.md`
**Iteration:** 1

## Summary

| Metric | Value |
|--------|-------|
| Findings in scope (fix_scope=all) | 7 |
| Fixed (test-only / non-functional) | 4 |
| Skipped (design-locked or future enhancement) | 3 |
| Status | `all_in_scope_resolved` |

Phase 32 was already UAT-signed-off on 2026-04-26 by park sang young (decision = pass, T-32-02 옵션 A 확정). This fix run is post-UAT cleanup and intentionally limits changes to **tests** and a **cosmetic import statement** — no shipped behavior is altered. All 4 applied fixes pass `vitest run presets` (9/9), `tsc --noEmit` (clean), and `vite build` (success).

## Verification gate

After all 4 commits, the following commands were re-run from scratch:

| Command | Result |
|---------|--------|
| `cd frontend && npx vitest run presets` | 9 passed (9) — 794ms |
| `cd frontend && npx tsc -p tsconfig.app.json --noEmit` | exit 0, no output |
| `cd frontend && npm run build` | built in 786ms, 2469 modules transformed |

Phase 32 UAT-verified behavior is preserved (no shipped logic touched).

## Fixed Issues

### WR-02: presets.test.ts — "meeting preset has 5 fields" 단언 fragile

- **File modified:** `frontend/src/features/admin/presets/presets.test.ts`
- **Commit:** `4b43780`
- **Applied fix:**
  - Replaced `toHaveLength(5)` + `toEqual(['title', 'meetingDate', ...])` array assertion with `new Set([...])` comparison.
  - Added structural counter assertion: `meeting` requires exactly 3 `type === 'table'` fields, `proposal` requires exactly 3 `type === 'textarea'` fields.
  - Removes both false-positive (legitimate field reorder fails) and false-negative (table→text type regression slips through) risks.
- **Inline comment added:** `// WR-02 fix (Phase 32 REVIEW): ...` references the source finding for future maintainers.

### IN-01: presets.test.ts — Korean preset name regex 한 글자만으로 통과

- **File modified:** `frontend/src/features/admin/presets/presets.test.ts`
- **Commit:** `e8a0fe1`
- **Applied fix:**
  - Replaced lenient `name.toMatch(/[가-힣]/)` (a single Korean char in any string passes — `"X회"` would slip through) with a whitelist of canonical Korean preset names per key (`expense → 경비신청서`, `meeting → 회의록`, etc.).
  - Added defensive full-string regex `^[가-힣\s·]+$` (entire name must be Korean letter / space / middle-dot) and `length >= 2`.
  - Catches both partial-Korean names AND silent name drift (e.g., someone renames `meeting` to `회의일지` — old test passes, new test fails immediately).
- **Inline comment added:** Cites Phase 32 REVIEW IN-01.

### IN-02: presets.test.ts — preset 키 단언이 정렬 의존

- **File modified:** `frontend/src/features/admin/presets/presets.test.ts`
- **Commit:** `34d7ce2`
- **Applied fix:**
  - Replaced `presets.map(p => p.key).sort()` + `toEqual([...])` array with `new Set(...)` comparison.
  - The intended contract is "all 6 preset keys present", not "this exact `localeCompare` sorted order". The test no longer breaks when the sort policy in `presets/index.ts` changes legitimately (e.g., future `category-then-key` sort).
- **Inline comment added:** Cites Phase 32 REVIEW IN-02.

### IN-03: PresetGallery.tsx — LucideIcon type import 일관성

- **File modified:** `frontend/src/features/admin/components/PresetGallery.tsx`
- **Commit:** `6cf52f4`
- **Applied fix:**
  - Split inline `type LucideIcon` (mixed value+type import) into a dedicated `import type { LucideIcon } from 'lucide-react'` statement immediately following the value-side import.
  - Cosmetic, no runtime change. Improves verbatimModuleSyntax consistency for future type-only imports from lucide-react.
- **Inline comment added:** Cites Phase 32 REVIEW IN-03 with rationale.

## Skipped Issues

### WR-01: meeting.json — column id `title` 이 root field id `title` 과 충돌 가능

- **File:** `frontend/src/features/admin/presets/meeting.json:43`
- **Skip reason:** **Design decision locked by CONTEXT D-A5 + UAT T-32-02.**
- **Rationale (cited):**
  - `32-CONTEXT.md` D-A5 (lines 25–30) deliberately specifies `agenda` table columns as `[number, title, description]` — i.e., `agenda.title` is the **chosen** option.
  - `32-HUMAN-UAT.md` Section 2-B item 21 (lines 88–92) explicitly tested cross-scope id collision and Section Sign-Off line 161 records: **"T-32-02 검증 결론: 옵션 A 확정 (DynamicTableField namespace 격리로 root title vs agenda.title 충돌 없음)"**.
  - UAT decision = pass on 2026-04-26 by park sang young.
  - Renaming column `title → subject` would invalidate UAT-verified shipped behavior, change `schema_definition_snapshot` for any docs already submitted with this template, and require re-running UAT.
- **Action taken:** None to source. Documented here in REVIEW-FIX.md per critical_context. Optional doc-comment in meeting.json was considered but skipped — JSON does not support comments and adding a sibling `_doc` key would invalidate `templateImportSchema.strict()`.

### IN-04: meeting.json — agenda.number 자동 채번 enhancement

- **File:** `frontend/src/features/admin/presets/meeting.json:42`
- **Skip reason:** **Future enhancement, not a bug.**
- **Rationale (cited):**
  - The reviewer themselves classified this as informational ("단기 수정은 불필요. 후속 phase 에서 ... 검토하세요" — REVIEW.md line 97).
  - `32-CONTEXT.md` `<deferred>` block line 169 already lists "회의록 agenda number 자동 채번: calculationRule 또는 frontend logic 으로 row index 자동 입력. v1.3+." as an explicit deferred idea.
  - Current behavior (manual integer entry) works correctly and is UAT-verified.
  - Auto-numbering would change UX semantics (calculationRule for row index has different validation paths from manual entry) and exceeds the post-UAT cleanup scope.
- **Action taken:** None. Already tracked in CONTEXT deferred ideas (no duplicate entry needed).

### IN-05: ko/admin.json — preset description i18n + JSON dual-source

- **File:** `frontend/public/locales/ko/admin.json:144-147`
- **Skip reason:** **Deliberate design decision (CONTEXT D-C5 + D-E1).**
- **Rationale (cited):**
  - `32-CONTEXT.md` D-C5 (line 53) explicitly specifies: "preset 표시 명 SoT = **i18n 우선, JSON `name` fallback** ... JSON 의 `name="회의록"` / `name="품의서"` 는 **fallback 으로 보존 (i18n 미로드 시 또는 export/import 경로용)**".
  - `32-CONTEXT.md` D-E1 + D-E2 confirm the JSON description is intentionally retained for export/import self-sufficiency (preset JSON files must be valid stand-alone artifacts).
  - The reviewer themselves noted "이는 의도된 trade-off (i18n 분리 vs preset 자족성) 일 가능성이 높지만" (REVIEW.md line 102) and recommended `Fix: 변경 불필요`.
  - "Dead code" framing is incorrect — JSON description is the canonical source for export/import paths and i18n-not-loaded scenarios (e.g., SSR, error boundaries before i18n init).
- **Action taken:** None. The dual-source pattern is the intended architecture per D-C5/D-E1.

## Findings table

| ID | Severity | Status | Commit |
|----|----------|--------|--------|
| WR-01 | Warning | Skipped (design-locked, D-A5 + UAT T-32-02) | — |
| WR-02 | Warning | Fixed | `4b43780` |
| IN-01 | Info | Fixed | `e8a0fe1` |
| IN-02 | Info | Fixed | `34d7ce2` |
| IN-03 | Info | Fixed | `6cf52f4` |
| IN-04 | Info | Skipped (deferred to v1.3+, already in CONTEXT deferred) | — |
| IN-05 | Info | Skipped (intended dual-source per D-C5/D-E1) | — |

---

_Fixed: 2026-04-29T16:48:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
