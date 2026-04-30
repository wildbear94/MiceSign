# Phase 36 — HUMAN UAT Checklist

**Created:** 2026-04-30
**Phase:** 36-form-row-layout — 양식 필드 한 줄 최대 3개 레이아웃
**Decision basis:** D-G5 (manual UAT) per `36-CONTEXT.md`
**Sign-off required from:** the user (project owner)

> Wave 1 (data model + Zod refinements + utility) ✓ committed in 36-01
> Wave 2 (builder UI: RowPositionSelector + FieldCard + SchemaFieldEditor) ✓ committed in 36-02
> Wave 3 (renderer: FormPreview + DynamicCustomForm + DynamicCustomReadOnly) ✓ committed in 36-03
> Wave 4 Tasks 1-2 (i18n + integration verification) ✓ committed in 36-04 — **automated gates PASS**:
> - tsc --noEmit: EXIT=0
> - vitest: 85 pass / 0 fail / 39 todo / 4 skipped (zero regression vs. Wave 3 baseline)
> - vite build: 697ms OK
> - Built CSS contains all 13+ dynamic-class tokens (md:grid-cols-1/2/3, border-l-{blue,emerald,violet,amber}-400 + dark:*, bg-{blue,emerald,violet,amber}-100 + dark:*, animate-pulse, ring-red-500)
>
> **This document is the final manual sign-off gate.**

---

## Setup

1. Stop any running dev servers.
2. From repo root: `cd frontend && npm run dev`. Note the Vite URL (typically http://localhost:5173).
3. Backend should also be running for full UAT (login + draft + submit cycle).
4. Login as a SUPER_ADMIN or ADMIN user (template builder access required).
5. Navigate to the template list (관리자 → 양식 관리).

**Tools needed:**
- Browser DevTools (viewport resize at Gate 4, DOM inspection at Gate 6)
- Access to a legacy CUSTOM document (any CUSTOM doc submitted before this phase)
- (Optional) Dark mode toggle: macOS System Preferences → Appearance → Dark, or browser dev tools "prefers-color-scheme" override

---

## Gate 1 — Builder pill selector renders + interacts (D-A1, D-A2, D-F2)

Steps:
1. Click "새 양식" (or open any existing CUSTOM template).
2. In the SchemaFieldEditor (left pane), click "필드 추가" → select "Text" type.
3. Expand the new FieldCard (chevron or click).
4. Locate the new "행 위치" section (between "필수 입력" checkbox and the type-specific config block).

Expected:
- [ ] "행 위치" label visible above the selector.
- [ ] Pill buttons present: `[단독] [+ 새 행]` initially. The `[행 N]` buttons appear only after clicking `[+ 새 행]`.
- [ ] `[단독]` button is selected (blue fill `bg-blue-600`, white text).
- [ ] Helper hint paragraph below selector reads exactly: `같은 '행' 의 필드들이 한 줄에 가로 배치됩니다 (모바일에서는 한 줄로 표시됩니다)`.
- [ ] All button text renders with the Pretendard font (no font fallback).
- [ ] Clicking `[+ 새 행]` adds a `[행 1]` button and selects it (this field is now in row 1). FieldCard outer wrapper grows a 4px **blue-400 left border**, and the collapsed header (when collapsed) shows a blue **"1행"** pill between TypeBadge and field name.
- [ ] Clicking `[단독]` returns the field to single-row mode; the left border disappears, the "1행" pill disappears.

---

## Gate 2 — Hard-cap-3 visual disable + flash + toast (D-F3)

Steps:
1. Add 3 fields (e.g., text + number + date) and assign all 3 to "행 1" via each FieldCard's row-position selector.
2. Verify each FieldCard now displays the **blue-400 left border** + "1행" pill in the collapsed header.
3. Add a 4th text field. In its FieldCard, expand and locate the row-position selector.
4. Hover over `[행 1]`.
5. Click `[행 1]` (currently disabled because row 1 is full).

Expected:
- [ ] On step 4 (hover): tooltip `이 행은 이미 3개 필드가 가득 찼습니다` appears via `title` attribute.
- [ ] `[행 1]` button is rendered in the **disabled style** (`bg-gray-100`, `text-gray-400`, `cursor-not-allowed`).
- [ ] On step 5 (click): the field's row position does NOT change (still "단독" — `field.rowGroup` stays `undefined`).
- [ ] A 200ms transient red flash appears on the disabled button (`animate-pulse ring-2 ring-red-500`). NOTE: native `<button disabled>` may suppress click events in some browsers — if the flash does NOT visibly appear, that's the native attribute working as intended; the multi-layer mitigation (T-36-06) catches the violation at the handler-side guard regardless.
- [ ] A sonner toast slides in with body: `한 줄에는 최대 3개 필드까지 배치할 수 있습니다`. Toast auto-dismisses after ~5s.

---

## Gate 3 — md+ grid layout in user-facing renderer (D-B1, D-E1, D-E2)

Steps:
1. Save the template (with 3 fields in row 1 from Gate 2).
2. Navigate to "기안 작성" → select your CUSTOM template.
3. Open the editor on a desktop viewport (≥768px wide; default desktop browser window).

Expected:
- [ ] The 3 row-1 fields render side-by-side in a single horizontal row (CSS grid `md:grid-cols-3`).
- [ ] Inter-field horizontal gap is `gap-4` (16px) — visually distinct from the legacy `space-y-4` 16px vertical inter-row spacing.
- [ ] Field labels and inputs align top-to-bottom within each cell (CSS grid default `items-stretch`).
- [ ] No visual break or overflow if a select option / input value is long (each cell has `min-w-0` to prevent grid blowout from intrinsic input min-width).
- [ ] Inspect with DevTools: confirm a `<div role="group" aria-label="1행 그룹" class="grid grid-cols-1 md:grid-cols-3 gap-4">` wrapper exists around the 3 cells.
- [ ] Each cell wrapper has `class="min-w-0"`.

---

## Gate 4 — sm 1-col fallback (D-E1)

Steps:
1. With the same draft open, narrow the browser window below 768px (or use DevTools mobile emulation — iPhone, Pixel, etc.).

Expected:
- [ ] All 3 row-1 fields collapse to a single vertical column (CSS `grid-cols-1` activated, `md:grid-cols-3` inactive at the sm breakpoint).
- [ ] Inter-field spacing matches the existing `space-y-4` (16px vertical).
- [ ] No horizontal scrolling, no clipped inputs.
- [ ] All fields remain functional (typing into inputs works).
- [ ] Resizing the window across the 768px breakpoint smoothly transitions between 3-col and 1-col layouts (no flicker, no layout shift on stable viewport).

---

## Gate 5 — Wide-type force-single-row guard (D-C1, D-C2, D-C4)

Steps:
1. In a fresh template draft (or modify an existing one), add a text field, set it to row 1.
2. Verify the FieldCard shows the blue-400 left border + "1행" pill (proof of starting state).
3. In its expanded FieldCard, change the field type from "Text" to "긴 텍스트 (Textarea)" via the type dropdown.

Expected:
- [ ] Immediately on type change:
  - [ ] A sonner toast slides in: `이 필드는 한 줄을 차지하는 필드라 행 그룹에서 빠집니다`.
  - [ ] The blue-400 left border disappears from the FieldCard outer wrapper.
  - [ ] The collapsed FieldCard header NO LONGER shows the blue "1행" pill.
  - [ ] Instead, an **amber `한 줄 차지` badge** with `Square` icon appears in the collapsed header next to the field type badge.
- [ ] Expand the FieldCard:
  - [ ] The "행 위치" selector section is **completely hidden** (not visible at all — not just disabled).
- [ ] Repeat the test starting from a `select` field with rowGroup=2, switching to `table` type:
  - [ ] Same auto-detach behavior — toast fires, "2행" pill replaced by amber "한 줄 차지" badge, RowPositionSelector hidden.

**Implementation reference:** `SchemaFieldEditor.updateField` guard runs BEFORE rules-cleanup branches (D-25 conditional, Phase 25 calculation). T-36-09 mitigation: admin cannot persist wide-type-with-rowGroup state via UI.

---

## Gate 6 — Backward compat / legacy SUBMITTED docs zero-shift (D-D1, D-D4)

Steps:
1. Locate or have available a legacy CUSTOM document submitted before Phase 36 shipped (any CUSTOM doc submitted before today's commits).
2. Open the document detail (read-only) view.
3. Open browser DevTools → Inspect the rendered DOM.

Expected:
- [ ] Layout is **identical** to before Phase 36 — vertical stack with `space-y-4` (16px) spacing between fields.
- [ ] **Zero `<div role="group">` wrappers** present in the rendered fields list (verify via DevTools `document.querySelectorAll('[role="group"][aria-label$="행 그룹"]').length === 0`, ignoring DrafterInfoHeader's `role="group"` from Phase 34 if it has one).
- [ ] If you have a screenshot from before Phase 36 (or visual memory): the rendering is byte-for-byte equivalent.
- [ ] Field rendering, conditional-rule visibility, and calculation values all behave as they did pre-Phase-36.
- [ ] Phase 24.1 conditional rules: hide/show toggles continue to work (any `condition` set fields hide as before).
- [ ] Phase 25 calculation rules: any auto-calculated fields render their computed values as before.
- [ ] Phase 34 DrafterInfoHeader continues to render at the top (header-external, body-untouched per D-B4).

**Implementation reference:** Legacy `schemaSnapshot.fields[*].rowGroup === undefined` → `groupFieldsByRow` first-branch short-circuit emits all-`{ kind: 'single' }` groups → renderer outputs identical `<div>` wrapping each field, no grid wrapper. Pinned by Wave 1 utility test case 2.

---

## Gate 7 — FormPreview live reflection (D-A3)

Steps:
1. Open a CUSTOM template in edit mode in the admin builder (관리자 → 양식 관리 → 양식 수정 OR 새 양식).
2. Locate the FormPreview pane (right side or modal pane).
3. Add 2 text fields and assign both to "행 1" via their selectors.

Expected:
- [ ] FormPreview INSTANTLY reflects the row group — both fields appear side-by-side at md+ viewport (`md:grid-cols-2`).
- [ ] No save / refresh required — change is immediate on pill click.
- [ ] Changing one field's row position back to "단독" via its selector instantly returns it to its own row in the preview (single-field layout).
- [ ] Adding a 3rd field to "행 1" instantly switches the preview row to `md:grid-cols-3`.
- [ ] If the FormPreview pane is narrow (<768px container width — possible if the modal split is narrow), the preview shows the 1-col fallback identically to the user-facing renderer at sm viewport — this is the truthful representation of the mobile experience.

---

## Optional — Dark Mode Spot Check (UI-SPEC plan-checker recommendation, non-blocking)

Steps:
1. Toggle macOS System Preferences → Appearance → Dark (or use DevTools "Emulate prefers-color-scheme: dark").
2. Re-perform Gate 1 (builder selector) and Gate 3 (renderer grid) in dark mode.

Expected:
- [ ] Builder rowGroup pill colors show dark variants (`bg-blue-900/40 text-blue-300` etc., per the 4-color cycle).
- [ ] FieldCard left border shows dark variant (`border-l-blue-500` etc.).
- [ ] Wide-type "한 줄 차지" amber badge shows dark variant (`bg-amber-900/40 text-amber-300`).
- [ ] Selected pill button shows dark accent (`bg-blue-500`).
- [ ] Disabled button + cursor-not-allowed visible under dark background.
- [ ] No light-mode-only color tokens accidentally rendered (white-on-white, dark-on-dark unreadable text).

If dark mode is not part of your testing matrix, this gate is informational only — the dark variants are statically enumerated (per Wave 1 `ROW_GROUP_*_CLASSES` SoT) and verified present in the built CSS (Wave 4 Task 2 grep).

---

## Optional — Phase 24.1 Conditional / Calculation Rule Regression Check (D-G4)

Steps:
1. Create a CUSTOM template with: field A (text, row 1), field B (number, row 1, with conditional rule: hide if A is empty), field C (number, row 1).
2. Open the template editor → user fills in: A="test" → B and C visible side-by-side.
3. User clears A → B becomes hidden via conditional rule.

Expected:
- [ ] When B is hidden via conditional rule, the **grid does NOT reflow** — the `md:grid-cols-3` track for B remains as an empty placeholder (CSS grid track auto-collapse is disabled for fixed-track grids; sibling cells stay in their original columns).
- [ ] A and C remain in their original columns 1 and 3.
- [ ] When A is filled again, B reappears in column 2 with no flicker.
- [ ] Add a calculation rule (e.g., D = B + C in row 2): D's auto-calculated value updates correctly when B/C change. Layout unchanged.

**Implementation reference:** UI-SPEC §"Conditional Rules × Row Groups" Table — "Field A in row group 1 has condition → hide" expected behavior: "Cell A renders display:none; cells B, C in same row remain in their grid columns." Phase 24.1's D-19 invariant preserved.

---

## Sign-off

**Tester:** park sang young (project owner)

**Date:** 2026-04-30

**Decision:** **PASS** — All 7 required gates ticked PASS.

---

**If PASS:**

1. Record sign-off in this file's footer (or commit a separate "PASS" annotation).
2. Resume the executor with `approved` (or just type "approved" to the parent agent).
3. Phase 36-04 SUMMARY will be drafted with PASS outcome embedded.
4. STATE.md / ROADMAP.md will be updated to mark Phase 36 complete.

**If FAIL:**

1. Note specific gate(s) and expectation(s) that failed.
2. Resume with: `failed: gate N — <brief reason>`.
3. Executor will route to `/gsd-plan-phase 36 --gaps` for gap-closure planning.

---

**Estimated total UAT time:** 15–20 minutes (Gates 1-7 sequential).
**Estimated optional gates:** +5 minutes (dark mode + conditional rule regression).
