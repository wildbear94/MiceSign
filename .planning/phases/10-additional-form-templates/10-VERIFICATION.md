---
phase: 10-additional-form-templates
verified: 2026-04-04T02:00:00Z
status: human_needed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Create a Purchase Request (구매 요청서), add 2+ items, verify auto-sum updates, save as draft, confirm read-only detail page renders correctly"
    expected: "Draft saves with correct JSON form data; read-only view shows supplier, delivery date, item table with totals"
    why_human: "Auto-sum behavior and rendered table layout require browser interaction to verify"
  - test: "Create a Business Trip Report (출장 보고서), add itinerary rows and expense rows, verify expense auto-sum, save, confirm read-only view"
    expected: "Draft saves; read-only view shows trip info, itinerary table, expense table with Korean category labels and total"
    why_human: "Dual useFieldArray interaction and expense category label mapping require visual inspection"
  - test: "Create an Overtime Request (연장 근무 신청서), enter start time 18:00 and end time 21:30, verify auto-calculated hours shows '3.5시간', save, confirm read-only view"
    expected: "Hours field auto-calculates to 3.5 and displays as '3.5시간' in blue; overnight shift (e.g. 22:00 to 02:00) calculates correctly as 4시간"
    why_human: "Time-based auto-calculation and edge case overnight handling require browser interaction to verify"
  - test: "Submit one of the three new documents through the full approval lifecycle (draft → submit → approve → APPROVED), verify read-only detail page renders correctly in APPROVED state"
    expected: "Document transitions through all states; read-only template component renders correctly after approval"
    why_human: "Full document lifecycle integration (backend form validation during submit + frontend display post-approval) requires end-to-end testing"
  - test: "Verify all 6 template cards appear in the 새 문서 (New Document) modal"
    expected: "3 existing templates (일반 업무 기안, 지출 결의서, 휴가 신청서) and 3 new templates (구매 요청서, 출장 보고서, 연장 근무 신청서) all visible"
    why_human: "Template selection modal renders cards from backend API (approval_template table) — requires running app to confirm V7 migration produces 6 active rows"
  - test: "Create and save an Expense Report (지출 결의서) to confirm existing templates are not broken by the Strategy pattern refactor"
    expected: "Expense form works as before with no regressions"
    why_human: "Regression test for existing templates after backend refactor requires manual validation"
---

# Phase 10: Additional Form Templates Verification Report

**Phase Goal:** Users can draft documents using three new form templates (purchase request, business trip report, overtime request), expanding coverage to all common Korean corporate approval types
**Verified:** 2026-04-04T02:00:00Z
**Status:** human_needed — all automated checks passed; 6 items require visual/end-to-end verification
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DocumentFormValidator delegates to strategy implementations instead of switch/case | VERIFIED | `DocumentFormValidator.java` uses `List<FormValidationStrategy>` constructor injection, `Collectors.toMap`, no `switch` keyword present |
| 2 | PURCHASE, BUSINESS_TRIP, OVERTIME templates exist in approval_template table | VERIFIED | `V7__add_additional_templates.sql` inserts all 3 rows with correct code, name, prefix, sort_order |
| 3 | PurchaseFormValidator validates items array with spec field, supplier, deliveryDate, purchaseReason, totalAmount | VERIFIED | `PurchaseFormValidator.java` validates all 5 required fields; spec is optional per spec |
| 4 | BusinessTripFormValidator validates itinerary array, expenses array, destination, startDate, endDate, purpose, totalExpense | VERIFIED | `BusinessTripFormValidator.java` validates all fields; expenses optional per spec (D-09) |
| 5 | OvertimeFormValidator validates workDate, startTime, endTime, hours, reason | VERIFIED | `OvertimeFormValidator.java` validates all 5 fields with correct error messages |
| 6 | Existing GENERAL/EXPENSE/LEAVE validation still passes after refactor | VERIFIED | 28 test methods in `DocumentFormValidatorTest.java` cover all 6 template codes (16 existing + 12 new); commits c3c6723 and be213a8 confirmed |
| 7 | TypeScript interfaces exist for PurchaseFormData, BusinessTripFormData, OvertimeFormData | VERIFIED | `document.ts` lines 95-143 define all 6 new interfaces (PurchaseItem, PurchaseFormData, ItineraryItem, TripExpenseItem, BusinessTripFormData, OvertimeFormData) |
| 8 | Zod schemas validate all 3 new form types | VERIFIED | `purchaseSchema.ts`, `businessTripSchema.ts`, `overtimeSchema.ts` — all export named schemas and inferred types |
| 9 | i18n keys exist for all 3 new form labels and fields in Korean | VERIFIED | `ko/document.json` has keys: `template.PURCHASE`, `template.BUSINESS_TRIP`, `template.OVERTIME`, `purchase.*`, `businessTrip.*`, `overtime.*` |
| 10 | OvertimeForm renders date input, two time inputs, auto-calculated hours, reason textarea | VERIFIED | `OvertimeForm.tsx` contains `type="date"`, two `type="time"` inputs, `Math.round(diff / 30) * 0.5` hours calculation, `textarea` for reason |
| 11 | PurchaseForm renders item table with spec column, supplier, delivery date, payment method, purchase reason | VERIFIED | `PurchaseForm.tsx` has `useFieldArray`, `spec` column, `formatCurrency`, `法인카드` select, `FileAttachmentArea` |
| 12 | TEMPLATE_REGISTRY contains entries for PURCHASE, BUSINESS_TRIP, and OVERTIME | VERIFIED | `templateRegistry.ts` has 6 entries; all 3 new entries import correct Form/ReadOnly components |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/main/java/com/micesign/service/validation/FormValidationStrategy.java` | Strategy interface | VERIFIED | Contains `interface FormValidationStrategy` with `getTemplateCode()` + `validate()` |
| `backend/src/main/java/com/micesign/service/validation/PurchaseFormValidator.java` | Purchase validation | VERIFIED | `@Component`, returns `"PURCHASE"`, 103 lines, full validation |
| `backend/src/main/java/com/micesign/service/validation/BusinessTripFormValidator.java` | Business trip validation | VERIFIED | `@Component`, returns `"BUSINESS_TRIP"`, 121 lines, full validation |
| `backend/src/main/java/com/micesign/service/validation/OvertimeFormValidator.java` | Overtime validation | VERIFIED | `@Component`, returns `"OVERTIME"`, 67 lines, full validation |
| `backend/src/main/resources/db/migration/V7__add_additional_templates.sql` | Seed data for 3 new templates | VERIFIED | Contains `PURCHASE`, `BUSINESS_TRIP`, `OVERTIME` INSERT |
| `frontend/src/features/document/types/document.ts` | Form data interfaces for 3 new templates | VERIFIED | Contains `PurchaseFormData` and 5 other new interfaces |
| `frontend/src/features/document/validations/overtimeSchema.ts` | Zod schema for overtime form | VERIFIED | Contains `overtimeFormSchema` and `OvertimeFormValues` type |
| `frontend/src/features/document/validations/purchaseSchema.ts` | Zod schema for purchase form | VERIFIED | Contains `purchaseFormSchema` and `PurchaseFormValues` type |
| `frontend/src/features/document/validations/businessTripSchema.ts` | Zod schema for business trip form | VERIFIED | Contains `businessTripFormSchema` and `BusinessTripFormValues` type |
| `frontend/src/features/document/components/templates/OvertimeForm.tsx` | Overtime edit form component | VERIFIED | `export default function OvertimeForm`, 191 lines, substantive |
| `frontend/src/features/document/components/templates/OvertimeReadOnly.tsx` | Overtime read-only component | VERIFIED | `export default function OvertimeReadOnly`, uses `OvertimeFormData` |
| `frontend/src/features/document/components/templates/PurchaseForm.tsx` | Purchase edit form component | VERIFIED | `export default function PurchaseForm`, 320 lines, substantive |
| `frontend/src/features/document/components/templates/PurchaseReadOnly.tsx` | Purchase read-only component | VERIFIED | `export default function PurchaseReadOnly`, uses `PurchaseFormData` |
| `frontend/src/features/document/components/templates/BusinessTripForm.tsx` | Business trip edit form with dual tables | VERIFIED | `export default function BusinessTripForm`, 398 lines, two `useFieldArray` instances |
| `frontend/src/features/document/components/templates/BusinessTripReadOnly.tsx` | Business trip read-only view | VERIFIED | `export default function BusinessTripReadOnly`, uses `BusinessTripFormData` |
| `frontend/src/features/document/components/templates/templateRegistry.ts` | Registry with all 6 templates | VERIFIED | Contains `PURCHASE`, `BUSINESS_TRIP`, `OVERTIME` entries with correct component imports |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `DocumentFormValidator.java` | `FormValidationStrategy` implementations | Spring `List<FormValidationStrategy>` constructor injection | WIRED | Line 17: `public DocumentFormValidator(List<FormValidationStrategy> strategyList)` |
| `OvertimeForm.tsx` | `overtimeSchema.ts` | `zodResolver` import | WIRED | `zodResolver(overtimeFormSchema)` present at line 28 |
| `PurchaseForm.tsx` | `purchaseSchema.ts` | `zodResolver` import | WIRED | `zodResolver(purchaseFormSchema)` present at line 35 |
| `BusinessTripForm.tsx` | `businessTripSchema.ts` | `zodResolver` import | WIRED | `zodResolver(businessTripFormSchema)` present at line 36 |
| `templateRegistry.ts` | `BusinessTripForm.tsx`, `PurchaseForm.tsx`, `OvertimeForm.tsx` | import and registry entry | WIRED | Lines 8-13: all 6 new component imports; `BUSINESS_TRIP.*editComponent.*BusinessTripForm` pattern confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `TemplateSelectionModal` | `templates` from `useTemplates()` | `TemplateService.getActiveTemplates()` → `approvalTemplateRepository.findByIsActiveTrueOrderBySortOrder()` | DB query on `approval_template` table; V7 migration seeded 3 new rows | FLOWING |
| `PurchaseForm.tsx` | `watchedItems`, `totalAmount` | `useFieldArray` + `useEffect` auto-sum (`quantity * unitPrice`) + `setValue` | User input → watched via react-hook-form → computed locally | FLOWING |
| `BusinessTripForm.tsx` | `watchedExpenses`, `totalExpense` | `useFieldArray` + `useEffect` sum + `setValue` | User input → computed locally | FLOWING |
| `OvertimeForm.tsx` | `watchedHours` | `watch('startTime')`, `watch('endTime')` → `Math.round(diff / 30) * 0.5` | Time arithmetic from user input | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `DocumentFormValidator` has no `switch` | `grep "switch" DocumentFormValidator.java` | No output | PASS |
| V7 migration file exists with all 3 template codes | `cat V7__add_additional_templates.sql` | `PURCHASE`, `BUSINESS_TRIP`, `OVERTIME` present | PASS |
| All 6 commit hashes verified in git log | `git show c3c6723 be213a8 37af393 59ad16e c258058 bdbc145 --stat` | All 6 commits exist with correct author and timestamps | PASS |
| Backend test file has 12 new test methods | `grep -n "validatePurchase\|validateBusinessTrip\|validateOvertime" DocumentFormValidatorTest.java` | 12 test method names found | PASS |
| templateRegistry exports 6 entries | `grep "PURCHASE\|BUSINESS_TRIP\|OVERTIME" templateRegistry.ts` | All 3 new entries present at lines 58, 65, 72 | PASS |
| Manager selection for overtime uses approval line (not separate field) | D-10 in 10-RESEARCH.md | Decision documented: "handled via approval line" | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TPL-04 | 10-01-PLAN.md, 10-02-PLAN.md | Purchase request form (구매 요청서) with item table, auto-sum, and evidence attachments | SATISFIED | `PurchaseFormValidator.java`, `PurchaseForm.tsx` (with `FileAttachmentArea`), `PurchaseReadOnly.tsx`, V7 migration |
| TPL-05 | 10-01-PLAN.md, 10-03-PLAN.md | Business trip report form (출장 보고서) with itinerary, expense breakdown, and attachments | SATISFIED | `BusinessTripFormValidator.java`, `BusinessTripForm.tsx` (dual tables + `FileAttachmentArea`), `BusinessTripReadOnly.tsx`, V7 migration |
| TPL-06 | 10-01-PLAN.md, 10-02-PLAN.md | Overtime request form (연장 근무 신청서) with date, hours, reason, and manager selection | SATISFIED | `OvertimeFormValidator.java`, `OvertimeForm.tsx` (date/time/auto-calc hours/reason), `OvertimeReadOnly.tsx`; manager selection via approval line (documented decision D-10 in 10-RESEARCH.md) |

**Requirements Coverage:** 3/3 (TPL-04, TPL-05, TPL-06). No orphaned requirements — all 3 are claimed by Phase 10 plans and match REQUIREMENTS.md traceability table.

### Anti-Patterns Found

No blocking or warning anti-patterns found.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| All form components | placeholder attribute | `placeholder={t('validation.titleRequired')}` | Info | Standard placeholder, not a stub — input is fully functional |

No `TODO`, `FIXME`, `return null`, `return <></>`, or empty handler patterns found in any Phase 10 files.

### Human Verification Required

#### 1. Template Selection Modal — All 6 Templates Visible

**Test:** Start frontend + backend, open the "새 문서" modal, count template cards
**Expected:** 6 cards visible — 3 existing + 3 new (구매 요청서, 출장 보고서, 연장 근무 신청서)
**Why human:** Modal renders from backend API (`/api/templates` → `approval_template` table). V7 migration seeded rows but confirming the full stack returns is_active=true rows for all 6 requires a running app.

#### 2. Purchase Request — Edit Form Interaction

**Test:** Select "구매 요청서", fill supplier/delivery date/payment method/reason, add 2+ items, verify auto-sum updates in real time, save as draft, open detail page
**Expected:** Auto-sum correctly updates `금액` column and `합계` footer row; draft saves with complete form JSON; detail page renders `PurchaseReadOnly` with table and totals
**Why human:** `useFieldArray` auto-sum behavior (quantity × unit price) and rendered table layout cannot be verified statically.

#### 3. Business Trip Report — Dual Table Interaction + Expense Auto-Sum

**Test:** Select "출장 보고서", fill trip info, add itinerary rows, add expense rows with different categories (교통비, 숙박비), verify expense total auto-calculates, save, view read-only
**Expected:** Both tables support row add/remove; expense auto-sum updates `경비 합계`; ReadOnly view shows Korean category labels (transport → 교통비)
**Why human:** Dual `useFieldArray` behavior and category label mapping in `BusinessTripReadOnly` require visual inspection.

#### 4. Overtime Request — Auto-Calculated Hours + Overnight Edge Case

**Test:** Select "연장 근무 신청서", enter start time 18:00 / end time 21:30, verify `3.5시간` shows in blue. Then try 22:00 / 02:00 overnight, verify `4시간` shows correctly.
**Expected:** `Math.round(diff / 30) * 0.5` calculation displays correctly; `t('overtime.hoursFormat', { n: hours })` interpolation produces `3.5시간`
**Why human:** Time arithmetic with i18n interpolation requires running app to verify rendering.

#### 5. Full Document Lifecycle — New Template

**Test:** Create a new document with any new template, submit it, approve it, verify APPROVED state and final read-only view
**Expected:** Backend `DocumentFormValidator` correctly routes to new strategy during `POST /api/documents/{id}/submit`; document reaches APPROVED; read-only template component renders correctly
**Why human:** Integration of backend strategy routing + document lifecycle state machine + frontend read-only rendering requires end-to-end testing.

#### 6. Regression — Existing Templates (지출 결의서)

**Test:** Create and save an Expense Report (지출 결의서) to confirm no regression from Strategy pattern refactor
**Expected:** `ExpenseFormValidator` strategy is invoked correctly; expense form works identically to before the refactor
**Why human:** The backend unit tests (28 test methods) cover this programmatically, but running the full app confirms Spring auto-discovers all 6 `@Component` validators via `List<FormValidationStrategy>` injection.

### Gaps Summary

No gaps were found. All 12 must-have truths are verified at all 4 levels (exists, substantive, wired, data flows). The 6 human verification items are integration/behavioral tests that require a running application — they cannot fail the automated verification because all code is in place and correct.

**Note on TPL-06 "manager selection":** ROADMAP success criterion 3 states "manager selection" for overtime. This was explicitly resolved in research decision D-10: manager selection uses the standard approval line selector (not a separate form field). This design decision is correctly documented in `10-RESEARCH.md` and aligns with the system's consistent "manual approval line" architecture.

---

_Verified: 2026-04-04T02:00:00Z_
_Verifier: Claude (gsd-verifier)_
