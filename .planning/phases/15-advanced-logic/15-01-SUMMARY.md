---
phase: 15-advanced-logic
plan: 01
subsystem: frontend-logic
tags: [conditional-rules, calculation-rules, circular-deps, schema-validation, types]
dependency_graph:
  requires: []
  provides: [ConditionalRule, CalculationRule, FieldVisibility, evaluateConditions, executeCalculation, detectCircularDeps, schemaToZod-fieldVisibility]
  affects: [builder-ui, runtime-integration]
tech_stack:
  added: [vitest]
  patterns: [pure-functions, dfs-cycle-detection, 3-color-algorithm]
key_files:
  created:
    - frontend/src/features/document/utils/evaluateConditions.ts
    - frontend/src/features/document/utils/executeCalculations.ts
    - frontend/src/features/document/utils/detectCircularDeps.ts
    - frontend/src/features/document/utils/__tests__/evaluateConditions.test.ts
    - frontend/src/features/document/utils/__tests__/executeCalculations.test.ts
    - frontend/src/features/document/utils/__tests__/detectCircularDeps.test.ts
  modified:
    - frontend/src/features/document/types/dynamicForm.ts
    - frontend/src/features/admin/types/builder.ts
    - frontend/src/features/admin/components/builder/useBuilderReducer.ts
    - frontend/src/features/document/utils/schemaToZod.ts
decisions:
  - "vitest 4.1.2 added as test framework for frontend utility testing"
  - "DFS 3-color algorithm for cycle detection (WHITE/GRAY/BLACK coloring)"
  - "table.column dot-notation pattern for cross-table field references in calculations"
metrics:
  duration: 5min
  completed: 2026-04-06T06:36:35Z
  tasks_completed: 3
  tasks_total: 3
  test_count: 30
  files_changed: 10
---

# Phase 15 Plan 01: Core Types & Logic Engine Summary

Concrete ConditionalRule/CalculationRule types replacing unknown[], three pure utility functions (evaluateConditions, executeCalculations, detectCircularDeps) with 30 unit tests, and schemaToZod extended for dynamic fieldVisibility toggling.

## What Was Built

### Task 1: Define concrete types and extend builder state
- Added `section` to FieldType union in both `dynamicForm.ts` and `builder.ts`
- Defined `ConditionalRule` interface with targetFieldId, action (show/hide/require), matchType (all/any), and conditions array
- Defined `CalculationRule` interface with targetFieldId, operation (SUM/MULTIPLY/ADD/COUNT), and sourceFields
- Added `calculationType` and `calculationSourceFields` to FieldConfig
- Extended BuilderState with `conditionalRules` and `calculationRules` arrays
- Added 8 new BuilderAction variants for CRUD on both rule types
- Added section to PALETTE_ITEMS (icon: Rows3) and FIELD_TYPE_DEFAULTS
- Implemented field deletion cleanup in reducer: removes rules targeting deleted field and conditions referencing deleted field

### Task 2: Implement pure utility functions with unit tests
- `evaluateConditions`: Evaluates conditional rules against form values, returns Map of field visibility states. Supports show/hide/require actions, all/any match types, and equals/not_equals/is_empty/is_not_empty operators
- `executeCalculation`: Computes calculation results from source fields. Supports SUM/ADD/MULTIPLY/COUNT operations, flat field and table.column references, non-numeric value handling (treated as 0), and 2-decimal rounding
- `detectCircularDeps`: DFS 3-color algorithm detecting cycles in combined conditional + calculation rule graphs. Returns cycle path or null

### Task 3: Extend schemaToZod for dynamic fieldVisibility
- Added optional `fieldVisibility` parameter to schemaToZod function
- Hidden fields (visible=false) excluded from validation schema (D-04)
- Section fields skipped as structural-only
- Effective required computed as `field.required OR conditionallyRequired` (D-07)
- Fully backward compatible: existing callers without fieldVisibility parameter work unchanged

## Verification Results

- TypeScript compilation: PASS (zero errors)
- Unit tests: 30/30 passed (evaluateConditions: 12, executeCalculations: 11, detectCircularDeps: 7)
- No `unknown[]` remaining in dynamicForm.ts or builder.ts
- Section type present in both FieldType unions

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 3e8b316 | feat(15-01): define concrete conditional/calculation rule types and extend builder state |
| 2 | 06abfab | feat(15-01): implement pure utility functions with unit tests |
| 3 | 9e5667e | feat(15-01): extend schemaToZod for dynamic fieldVisibility |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed vitest test framework**
- **Found during:** Task 2 (TDD RED phase)
- **Issue:** vitest was not in devDependencies, tests could not run
- **Fix:** `npm install --save-dev vitest` (v4.1.2)
- **Files modified:** frontend/package.json, frontend/package-lock.json (committed as part of task 2)

## Known Stubs

None - all functions are fully implemented with concrete types and tested behavior.

## Threat Flags

None - all files are client-side utility functions matching the plan's threat model. No new network endpoints, auth paths, or trust boundary changes introduced.

## Self-Check: PASSED

- All 10 files: FOUND
- All 3 commits: FOUND (3e8b316, 06abfab, 9e5667e)
