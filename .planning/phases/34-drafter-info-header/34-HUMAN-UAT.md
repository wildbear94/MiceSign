---
phase: 34-drafter-info-header
document: HUMAN-UAT
plan: 06
status: in-progress
tester: park sang young
created: 2026-04-29
related:
  - .planning/phases/34-drafter-info-header/34-UI-SPEC.md
  - .planning/phases/34-drafter-info-header/34-VALIDATION.md
  - .planning/phases/34-drafter-info-header/34-CONTEXT.md
note: |
  Plan 34-06 Task 1 ran the full automated regression sweep (BE+FE suites + tsc + build + 4 grep-level invariants) and recorded the results below.
  Plan 34-06 Task 2 is this manual UAT — tester walks the matrix and marks each row PASS / FAIL / N/A. Sign-off at the bottom closes Phase 34.
---

# Phase 34 — HUMAN UAT

> Manual verification gate for the always-on `DrafterInfoHeader` across all 14 form integration points + responsive + dark mode + legacy fallback + i18n.
> Conventions follow `31-HUMAN-UAT.md` (Phase 31 dashboard wrap-up).

---

## Automated Regression Results (Task 1)

**Run:** 2026-04-29 (Plan 34-06 Task 1 — automated regression gate)

| Gate | Command | Result | Notes |
|------|---------|--------|-------|
| BE full suite | `cd backend && ./gradlew test` | **PASS (with documented pre-existing failures)** | 173 total, 170 PASS, 3 FAIL — the 3 failures (`ApprovalWorkflowTest.{approveDocument_success, rejectDocument_withComment, rewriteDocument_success}`) are pre-existing flakiness from `ApprovalEmailSender.persistLog` (`ObjectOptimisticLockingFailureException`) recorded in `deferred-items.md` from Plan 34-03 — verified pre-existing on `master` before any Phase 34 changes. **Phase 34-specific tests all PASS:** `DocumentSubmitTest` 12/12 (3 new: capture / nullPosition / immutability) + `AuthControllerTest` 7/7 (1 new: login_responseIncludesDeptAndPosition) + `AuthServiceTest` 1/1. |
| FE full suite | `cd frontend && npm test` | **PASS** | 11 test files PASS (4 skipped pre-existing), 63 tests PASS, 0 FAIL, 39 todo. Includes DrafterInfoHeader 3/3. Duration 2.81s. |
| TypeScript | `cd frontend && npx tsc --noEmit -p tsconfig.app.json` | **PASS** | Exit 0, **zero `error TS` lines**. The 2 handoff errors Plan 34-04 deliberately left for 34-05 (DocumentEditorPage L316 + DocumentDetailPage L251) are gone after 34-05 wired the props. |
| Build | `cd frontend && npm run build` | **PASS** | `tsc -b` + `vite build` exit 0. Built in 656ms, 2469 modules. Pre-existing >500 kB chunk warning is unrelated to this plan. |
| Grep invariant 1 — nested drafter | `grep -rn "doc\\.drafter\\." frontend/src/features/document/` | **0 (PASS, expected 0)** | Plan 34-01 + 34-05 fully eliminated nested access. |
| Grep invariant 2 — header imports | `grep -l "DrafterInfoHeader" frontend/src/features/document/components/templates/*.tsx frontend/src/features/document/components/dynamic/*.tsx \| wc -l` | **14 (PASS, expected 14)** | All 14 integration points (6 Edit + 6 ReadOnly + 2 Dynamic) import the component. Per-file list in Verification Evidence below. |
| Grep invariant 3 — BE snapshot site | `grep -rn "drafterSnapshot" backend/src/main/java/` | **3 occurrences in 1 method (PASS, expected single-site)** | Plan said "Expected: 1 (single-site)" — the **single-site** invariant holds: all 3 lexical occurrences (comment, `body.put(...)`, log error message) live inside a single block of `DocumentService.submitDocument()` lines 300~327. No BE drafterSnapshot writers anywhere else. |
| Grep invariant 4 — i18n keys | `node -e "console.log(Object.keys(require('./frontend/public/locales/ko/document.json').drafterInfo).length)"` | **8 (PASS, expected 8)** | UI-SPEC §i18n Key Contract: departmentLabel, positionLabel, drafterLabel, draftedAtLabel, draftedAtPlaceholder, currentInfoBadge, headerAriaLabel, emptyPosition. |

### Verification Evidence

**14 files importing DrafterInfoHeader (Edit/ReadOnly/Dynamic):**

```
frontend/src/features/document/components/templates/BusinessTripForm.tsx
frontend/src/features/document/components/templates/BusinessTripReadOnly.tsx
frontend/src/features/document/components/templates/ExpenseForm.tsx
frontend/src/features/document/components/templates/ExpenseReadOnly.tsx
frontend/src/features/document/components/templates/GeneralForm.tsx
frontend/src/features/document/components/templates/GeneralReadOnly.tsx
frontend/src/features/document/components/templates/LeaveForm.tsx
frontend/src/features/document/components/templates/LeaveReadOnly.tsx
frontend/src/features/document/components/templates/OvertimeForm.tsx
frontend/src/features/document/components/templates/OvertimeReadOnly.tsx
frontend/src/features/document/components/templates/PurchaseForm.tsx
frontend/src/features/document/components/templates/PurchaseReadOnly.tsx
frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx
frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx
```

**BE single-site evidence (`grep -rn drafterSnapshot backend/src/main/java`):**

```
backend/src/main/java/com/micesign/service/DocumentService.java:300:        // submission timestamp into content.formData under a new `drafterSnapshot`
backend/src/main/java/com/micesign/service/DocumentService.java:323:            body.put("drafterSnapshot", snapshot);
backend/src/main/java/com/micesign/service/DocumentService.java:327:            log.error("Failed to serialize drafterSnapshot for document {}: {}",
```

All 3 lexical hits cluster within a single block (lines 300-327) of `DocumentService.submitDocument()` — confirms the single-site invariant from Plan 34-03.

### Regression Gate Decision

**PASS — proceed to Task 2 manual UAT.**

The 3 BE test failures are unambiguously pre-existing (verified on `master` before any Phase 34 changes per Plan 34-03 SUMMARY § "Issues Encountered" + `deferred-items.md`). They are tracked for resolution in a future phase and do not block Phase 34 closure.

---

## Manual UAT Matrix (Task 2)

**Setup before walking the matrix:**

1. Start the dev environment in two terminals:
   ```bash
   cd backend && ./gradlew bootRun     # serves http://localhost:8080
   cd frontend && npm run dev          # serves http://localhost:5173
   ```
2. Log in as a user who has both a department AND a position assigned. The V2 seeded `SUPER_ADMIN` (department_id=1, position_id=1) is the recommended account.
3. Open Chrome DevTools → Toggle Device Toolbar (`Cmd+Shift+M` / `Ctrl+Shift+M`) — needed for Matrix C responsive checks.
4. Optional: prepare a 2nd browser-profile or incognito session if you want to keep DRAFT and SUBMITTED docs side-by-side.

**Mark each row** (`☐` = not yet, `[x]` = PASS, `[~]` = PASS with cosmetic note, `[!]` = FAIL with notes).

---

### Matrix A — Built-in form types × DRAFT / SUBMITTED (12 scenarios)

For each of the 6 built-in form types, walk these steps. The DrafterInfoHeader must render at the **TOP** of the form (above the existing template label / title / body), with **4 cells** in this exact order on md+: 부서 | 직위·직책 | 기안자 | 기안일.

**A1. GENERAL (일반 기안)**

- [ ] **A1.D — DRAFT mode (new doc)** — Click "새 문서 작성" → select 일반 기안 → editor page renders header at top with: 부서 = your dept name, 직위·직책 = your position name, 기안자 = your name, 기안일 = `—` (em dash placeholder). NO `(현재 정보)` badge. Save the draft, re-open from "내 문서" — header still shows DRAFT mode (live data, `—` for date).
- [ ] **A1.S — SUBMITTED mode** — From the saved draft, add an approver to the approval line → click 상신. Open the submitted document → header now shows SUBMITTED mode: same 4 fields snapshotted (dept/position/name) + 기안일 in `YYYY. MM. DD.` format (e.g. `2026. 04. 29.`). NO `(현재 정보)` badge. Below the header: meta-grid does NOT show a separate 기안자 cell (Plan 34-05 removed it).

**A2. EXPENSE (비용 청구)**

- [ ] **A2.D — DRAFT mode** — Same expectations as A1.D. Header at TOP, 4 cells live, `—` date, no badge.
- [ ] **A2.S — SUBMITTED mode** — Same expectations as A1.S. Snapshot 4 fields, formatted date, no badge, no duplicate 기안자 cell.

**A3. LEAVE (휴가 신청)**

- [ ] **A3.D — DRAFT mode** — Header at TOP, 4 cells live, `—` date, no badge.
- [ ] **A3.S — SUBMITTED mode** — Snapshot 4 fields, formatted date, no badge, no duplicate cell.

**A4. PURCHASE (구매 요청)**

- [ ] **A4.D — DRAFT mode** — Header at TOP, 4 cells live, `—` date, no badge.
- [ ] **A4.S — SUBMITTED mode** — Snapshot 4 fields, formatted date, no badge, no duplicate cell.

**A5. BUSINESS_TRIP (출장 신청)**

- [ ] **A5.D — DRAFT mode** — Header at TOP, 4 cells live, `—` date, no badge.
- [ ] **A5.S — SUBMITTED mode** — Snapshot 4 fields, formatted date, no badge, no duplicate cell.

**A6. OVERTIME (시간외 근무 신청)**

- [ ] **A6.D — DRAFT mode** — Header at TOP, 4 cells live, `—` date, no badge.
- [ ] **A6.S — SUBMITTED mode** — Snapshot 4 fields, formatted date, no badge, no duplicate cell.

---

### Matrix B — CUSTOM dynamic form × DRAFT / SUBMITTED (2 scenarios)

Custom forms use `DynamicCustomForm` / `DynamicCustomReadOnly`. They handle the 4 Phase 32 presets (회의록 / 품의서 / 회의록 등) AND user-defined CUSTOM templates.

**B1. Phase 32 preset (e.g. 회의록 / MEETING)**

- [ ] **B1.D — DRAFT mode** — Admin → 양식 관리 → ensure a Phase 32 preset (회의록 or 품의서) is published. Click "새 문서 작성" → select that template → editor page renders header at TOP (above the dynamic form fields). 4 cells live, `—` date, no badge.
- [ ] **B1.S — SUBMITTED mode** — Save → submit → open detail. Snapshot 4 fields, formatted date, no badge.

**B2. User-defined CUSTOM template (any non-preset CUSTOM)**

- [ ] **B2.D — DRAFT mode** — Pick any user-defined CUSTOM template (or create a minimal one in admin if needed). Click "새 문서 작성" → editor renders header at TOP. 4 cells live, `—` date, no badge.
- [ ] **B2.S — SUBMITTED mode** — Save → submit → open detail. Snapshot 4 fields, formatted date, no badge.

---

### Matrix C — Responsive layout (D-D5)

**C1. md+ viewport (≥768px)**

- [ ] On any submitted document detail page, set DevTools viewport to **1024×768** (or any width ≥ 768px). The header renders **4-column row** (single row): 부서 | 직위·직책 | 기안자 | 기안일.
- [ ] No text overflow / truncation for typical Korean dept/name/position values (e.g. `시스템관리부` / `시스템관리자` / 한국 이름 5자 / `2026. 04. 29.`).

**C2. sm viewport (<768px)**

- [ ] Toggle viewport to **375×667 (iPhone SE)** or any width < 768px. The header renders **2-column 2-row grid**: row 1 = 부서 / 직위·직책, row 2 = 기안자 / 기안일.
- [ ] No text overflow / truncation in the narrower cells.

**C3. md→sm transition smoothness**

- [ ] Drag the DevTools viewport boundary from 1200 → 360 — the grid transition at 768px is clean (no half-broken intermediate layout, no overlapping cells).

---

### Matrix D — Legacy fallback "(현재 정보)" badge (D-D4)

Find a SUBMITTED document whose `form_data` lacks the `drafterSnapshot` key (i.e. submitted before this phase landed, or manually edited).

**Setup option (a) — find existing legacy doc:**
```sql
SELECT id, document_id, JSON_EXTRACT(form_data, '$.drafterSnapshot') AS snapshot
FROM document_content
WHERE JSON_EXTRACT(form_data, '$.drafterSnapshot') IS NULL
LIMIT 5;
```
Pick any returned document_id and open `/documents/{id}`.

**Setup option (b) — synthesize one:**
```sql
UPDATE document_content
SET form_data = '{"someExistingKey":"value"}'
WHERE document_id = <some_submitted_doc_id>;
```

- [ ] **D1 — Header renders 4 fields using LIVE data** — dept/position/name come from the user's CURRENT department + position (not the historical snapshot which is absent).
- [ ] **D2 — `(현재 정보)` badge visible** — appears inline-right of the 기안자 name. Text color is amber-600 (light) / amber-400 (dark). Text reads exactly `(현재 정보)` (8 characters in parentheses).
- [ ] **D3 — 기안일 still renders** — uses `existingDoc.submittedAt` as fallback; formatted `YYYY. MM. DD.` like normal SUBMITTED mode.

---

### Matrix E — Dark mode (UI-SPEC §Color, D-D5)

Toggle OS-level dark mode (macOS: System Settings → Appearance → Dark; Windows: Settings → Personalization → Dark). The project uses `darkMode: 'media'` (system preference).

- [ ] **E1 — Header background** — `bg-gray-900` (dark gray, near-black). Surrounding card same as `DocumentDetailPage` cards (consistent).
- [ ] **E2 — Border** — visible thin border `border-gray-700`.
- [ ] **E3 — Label text** — `text-gray-400` (4 labels: 부서, 직위·직책, 기안자, 기안일). Legible against the dark surface.
- [ ] **E4 — Value text** — `text-gray-50` (near-white). High contrast against dark surface (≥ AAA per UI-SPEC).
- [ ] **E5 — Legacy badge in dark mode** — when present (visit a legacy doc from Matrix D), badge color is `text-amber-400` (lighter amber). Distinct from value text, easily noticed.
- [ ] **E6 — No legibility regressions** — re-walk one A-row in dark mode (e.g. A1.S) to confirm no contrast issues across the full header.

---

### Matrix F — Korean i18n display

The 8 i18n keys live under `document.drafterInfo.*` in `frontend/public/locales/ko/document.json`. UI text must render exactly as below.

- [ ] **F1 — Label 1** — `부서` (department, 2 chars).
- [ ] **F2 — Label 2** — `직위·직책` — uses U+00B7 middle dot (`·`), NOT a regular period (`.`) and NOT a hyphen (`-`). Verify visually by zooming if needed — middle dot sits at the vertical center of the line.
- [ ] **F3 — Label 3** — `기안자` (drafter, 3 chars).
- [ ] **F4 — Label 4** — `기안일` (drafted-at date, 3 chars).
- [ ] **F5 — Legacy badge text** — `(현재 정보)` (8 chars including parentheses and the space).
- [ ] **F6 — DRAFT date placeholder** — `—` (em dash, U+2014, NOT regular hyphen `-` or en dash `–`).
- [ ] **F7 — Position null placeholder** — `—` (em dash). Trigger by visiting a doc by a user whose `position_id` is null, or by setting your own position to null in admin → 사용자 관리.
- [ ] **F8 — ARIA label** — Inspect element on the `<dl>` → `aria-label="기안자 정보"` (Korean phrase).

---

### Matrix G — DocumentDetailPage meta-grid review (D-D6 cleanup)

**G1 — meta-grid row 1 has 3 cells, not 4** — open any submitted document detail page on md+ viewport. The row immediately below the new DrafterInfoHeader (양식 / 상태 / 문서번호) renders **3 cells** in row 1, not 4. The original 4th cell (기안자) was removed by Plan 34-05 to avoid duplication with the header.

- [ ] G1 — meta-grid row 1 = 3 cells (양식 / 상태 / 문서번호), no 4th 기안자 cell.

---

## Total Scenarios

- Matrix A: 12 (6 forms × 2 modes)
- Matrix B: 4 (2 templates × 2 modes)
- Matrix C: 3 (md+ / sm / transition)
- Matrix D: 3 (legacy fallback breakdown)
- Matrix E: 6 (dark mode)
- Matrix F: 8 (i18n)
- Matrix G: 1 (cleanup verification)

**Total checkboxes: 37** (≈30~45 minutes of focused QA)

---

## Cosmetic Notes (capture during walk-through)

> If any row passes but with a minor visual nit, list it here. Cosmetic notes do NOT block Phase 34 closure but feed the next polish iteration.

_(empty)_

---

## Failures (capture during walk-through)

> List failed rows with observed-vs-expected. Any failure blocks Phase 34 closure and triggers `/gsd-plan-phase 34 --gaps` for remediation.

_(empty)_

---

## Sign-off

Once every row above is `[x]` (or `[~]` with cosmetic notes documented), the tester signs off here.

- [ ] All 37 scenarios PASS (or PASS-with-cosmetic-notes)
- [ ] **Tester:** ______________________
- [ ] **Date:** ______________________
- [ ] **Decision:** `approved` / `approved with notes: <text>` / `gaps: <list>`

---

## Resume signal (Plan 34-06 Task 2)

Reply to the orchestrator with one of:

- `approved` — All UAT scenarios PASS. Phase 34 closes. The orchestrator runs the wrap-up sequence (ROADMAP + STATE + VALIDATION updates per Plan 34-06 `<output>` block).
- `approved with notes: <text>` — All scenarios PASS but with minor cosmetic notes for follow-up.
- `gaps: <list>` — One or more scenarios FAILED. Provide the failing matrix row(s) and observed-vs-expected. Phase 34 does NOT close; orchestrator runs `/gsd-plan-phase 34 --gaps` to plan remediation.

---

*Phase: 34-drafter-info-header*
*Plan 34-06 Task 1 (automated regression): COMPLETE — 2026-04-29*
*Plan 34-06 Task 2 (manual UAT): AWAITING TESTER SIGN-OFF*
