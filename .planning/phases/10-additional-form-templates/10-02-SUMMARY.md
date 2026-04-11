---
phase: 10-additional-form-templates
plan: 02
subsystem: ui
tags: [react, typescript, zod, react-hook-form, i18n, forms]

requires:
  - phase: 04-document-core-templates
    provides: Template registry pattern, ExpenseForm/LeaveForm reference components, currency utils
  - phase: 10-additional-form-templates (plan 01)
    provides: Backend validators and Flyway migration for 3 new templates
provides:
  - TypeScript interfaces for PurchaseFormData, BusinessTripFormData, OvertimeFormData
  - Zod validation schemas for 3 new form types
  - i18n keys (ko/en) for purchase, businessTrip, overtime forms
  - OvertimeForm with auto-calculated hours from time inputs
  - OvertimeReadOnly for parsed overtime display
  - PurchaseForm with extended item table, auto-sum, FileAttachmentArea
  - PurchaseReadOnly with formatted table and totals
affects: [10-additional-form-templates plan 03, template-registry]

tech-stack:
  added: []
  patterns: [overnight-time-calculation, extended-item-table-with-spec-column]

key-files:
  created:
    - frontend/src/features/document/validations/purchaseSchema.ts
    - frontend/src/features/document/validations/businessTripSchema.ts
    - frontend/src/features/document/validations/overtimeSchema.ts
    - frontend/src/features/document/components/templates/OvertimeForm.tsx
    - frontend/src/features/document/components/templates/OvertimeReadOnly.tsx
    - frontend/src/features/document/components/templates/PurchaseForm.tsx
    - frontend/src/features/document/components/templates/PurchaseReadOnly.tsx
  modified:
    - frontend/src/features/document/types/document.ts
    - frontend/public/locales/ko/document.json
    - frontend/public/locales/en/document.json

key-decisions:
  - "Overnight shift handling: endTime < startTime adds 24h for correct hour calculation"
  - "FileAttachmentArea on PurchaseForm only (not Overtime) per plan spec"
  - "Payment method select with Korean option labels (법인카드, 계좌이체, 현금, 기타)"

patterns-established:
  - "Time-to-hours auto-calculation with 0.5h rounding via Math.round(diff/30)*0.5"
  - "Extended item table pattern (spec column) building on ExpenseForm useFieldArray"

requirements-completed: [TPL-04, TPL-06]

duration: 4min
completed: 2026-04-04
---

# Phase 10 Plan 02: Frontend Types, Schemas & Form Components Summary

**TypeScript types + Zod schemas for 3 new templates, plus OvertimeForm (auto-calc hours) and PurchaseForm (extended item table with spec column and file attachments)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T00:20:37Z
- **Completed:** 2026-04-04T00:24:43Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- TypeScript interfaces for PurchaseFormData, BusinessTripFormData, OvertimeFormData with all nested types
- Zod validation schemas (purchaseFormSchema, businessTripFormSchema, overtimeFormSchema) following existing pattern
- i18n keys in Korean and English for all 3 new template forms
- OvertimeForm with date/time inputs, auto-calculated hours (0.5h rounding, overnight handling), reason textarea
- PurchaseForm with supplier/delivery/payment fields, extended item table (spec column), auto-sum, FileAttachmentArea
- Both ReadOnly components rendering parsed JSON as formatted plain text

## Task Commits

Each task was committed atomically:

1. **Task 1: TypeScript types + Zod schemas + i18n keys** - `37af393` (feat)
2. **Task 2: OvertimeForm + OvertimeReadOnly** - `59ad16e` (feat)
3. **Task 3: PurchaseForm + PurchaseReadOnly** - `c258058` (feat)

## Files Created/Modified
- `frontend/src/features/document/types/document.ts` - Added 6 new interfaces (PurchaseItem, PurchaseFormData, ItineraryItem, TripExpenseItem, BusinessTripFormData, OvertimeFormData)
- `frontend/src/features/document/validations/purchaseSchema.ts` - Zod schema for purchase form with item array validation
- `frontend/src/features/document/validations/businessTripSchema.ts` - Zod schema for business trip with itinerary and expense arrays
- `frontend/src/features/document/validations/overtimeSchema.ts` - Zod schema for overtime with 0.5h minimum hours
- `frontend/public/locales/ko/document.json` - Korean i18n keys for purchase, businessTrip, overtime
- `frontend/public/locales/en/document.json` - English i18n keys for same
- `frontend/src/features/document/components/templates/OvertimeForm.tsx` - Edit form with auto-calc hours
- `frontend/src/features/document/components/templates/OvertimeReadOnly.tsx` - Read-only overtime display
- `frontend/src/features/document/components/templates/PurchaseForm.tsx` - Edit form with item table and attachments
- `frontend/src/features/document/components/templates/PurchaseReadOnly.tsx` - Read-only purchase display

## Decisions Made
- Overnight shift handling: when endTime < startTime, add 24*60 minutes to endMinutes for correct calculation
- FileAttachmentArea included only on PurchaseForm (not OvertimeForm) as spec indicates
- Payment method options hardcoded in Korean (법인카드, 계좌이체, 현금, 기타) matching domain conventions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BusinessTripForm (plan 03) ready to implement using established types, schema, and i18n keys
- Template registry update (plan 03) ready to wire all 3 new components
- All TypeScript compilation passes cleanly

---
*Phase: 10-additional-form-templates*
*Completed: 2026-04-04*
