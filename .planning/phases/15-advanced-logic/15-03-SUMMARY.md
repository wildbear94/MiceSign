---
phase: 15-advanced-logic
plan: 03
subsystem: runtime-integration
tags: [conditional-logic, calculation-engine, section-field, circular-dep-validation, useWatch]
dependency_graph:
  requires: [evaluateConditions, executeCalculation, detectCircularDeps, schemaToZod-fieldVisibility, ConditionalRule, CalculationRule]
  provides: [runtime-condition-evaluation, runtime-calculation-execution, hidden-field-cleanup, section-grouping, backend-circular-dep-validation]
  affects: [document-form, template-admin, read-only-view]
tech_stack:
  added: []
  patterns: [useWatch-condition-evaluation, section-aware-rendering, DFS-3-color-backend-validation, hidden-field-value-cleanup]
key_files:
  created:
    - frontend/src/features/document/components/templates/dynamic/DynamicSectionField.tsx
    - backend/src/main/java/com/micesign/service/CircularDependencyValidator.java
    - backend/src/test/java/com/micesign/service/CircularDependencyValidatorTest.java
  modified:
    - frontend/src/features/document/components/templates/DynamicForm.tsx
    - frontend/src/features/document/components/templates/dynamic/DynamicFieldRenderer.tsx
    - frontend/src/features/document/components/templates/dynamic/DynamicNumberField.tsx
    - frontend/src/features/document/components/templates/dynamic/DynamicFieldWrapper.tsx
    - frontend/src/features/document/components/templates/dynamic/DynamicTextField.tsx
    - frontend/src/features/document/components/templates/dynamic/DynamicTextareaField.tsx
    - frontend/src/features/document/components/templates/dynamic/DynamicDateField.tsx
    - frontend/src/features/document/components/templates/dynamic/DynamicSelectField.tsx
    - frontend/src/features/document/components/templates/DynamicReadOnly.tsx
    - backend/src/main/java/com/micesign/service/AdminTemplateService.java
decisions:
  - "useWatch subscribes only to source field IDs (not all fields) for performance"
  - "JSON.stringify(watchedValues) used as useMemo dependency to stabilize object references and prevent infinite loops"
  - "Section visibility propagation: hidden section hides all child fields until next section"
  - "DynamicFieldWrapper extended with labelExtra and isConditionallyRequired props rather than separate wrapper components"
  - "Backend CircularDependencyValidator uses same DFS 3-color algorithm as frontend detectCircularDeps.ts"
metrics:
  duration: 9min
  completed: 2026-04-06T06:56:00Z
  tasks_completed: 3
  tasks_total: 3
  test_count: 6
  files_changed: 13
---

# Phase 15 Plan 03: Runtime Integration & Backend Validation Summary

DynamicForm runtime fully wired with useWatch-based condition evaluation, calculation auto-execution, hidden field cleanup, section-aware grouping with collapsible headers, and backend DFS circular dependency validation on template save.

## What Was Built

### Task 1: DynamicForm runtime integration — conditions, calculations, hidden field cleanup
- Added useWatch subscription to source field IDs extracted from conditional and calculation rules
- Integrated evaluateConditions to compute field visibility from form values in real-time
- Integrated executeCalculation to auto-compute and set values on calculation target fields
- Added section visibility propagation: hidden section cascades to all child fields (D-19)
- Added hidden field value cleanup via useEffect tracking visibility transitions (D-04)
- Updated submit handler to filter hidden field values from submitted data (D-04)
- Updated DynamicNumberField with readOnly mode, bg-gray-100 styling, and "자동 계산" badge for calculated fields
- Extended DynamicFieldWrapper with labelExtra and isConditionallyRequired props
- Added isConditionallyRequired prop chain through DynamicTextField, DynamicTextareaField, DynamicDateField, DynamicSelectField, DynamicNumberField
- Amber asterisk indicator for conditionally required fields (text-amber-600 dark:text-amber-400)

### Task 2: DynamicSectionField component + ReadOnly section rendering
- Created DynamicSectionField with collapsible edit mode (ChevronDown toggle, aria-expanded, aria-controls, role=region) and flat read-only mode
- DynamicForm groups fields into sections using renderFields() with flush pattern
- DynamicReadOnly groups fields into sections with DynamicSectionField isReadOnly
- DynamicFieldRenderer handles section case

### Task 3: Backend CircularDependencyValidator + AdminTemplateService integration (TDD)
- Created CircularDependencyValidator @Component with DFS 3-color algorithm
- Builds dependency graph from both conditionalRules and calculationRules
- Returns Optional<List<String>> cycle path for error messaging
- AdminTemplateService injects validator and calls validateNoCycle in both createTemplate and updateTemplate
- Throws IllegalArgumentException with "순환 의존성" message and cycle path
- 6 unit tests: empty rules, linear chain, simple cycle, mixed rules cycle, null JSON, self-reference

## Verification Results

- TypeScript compilation: PASS (zero errors)
- Backend tests: 6/6 passed (CircularDependencyValidatorTest)
- DynamicForm uses useWatch and evaluateConditions: Confirmed
- DynamicSectionField has aria-expanded and collapse toggle: Confirmed
- AdminTemplateService calls validateNoCycle in updateTemplate and createTemplate: Confirmed

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | cc7381c | feat(15-03): integrate runtime condition evaluation, calculation engine, and hidden field cleanup into DynamicForm |
| 2 | d0d426a | feat(15-03): add section-aware rendering in DynamicReadOnly with DynamicSectionField |
| 3 (RED) | 90a8e09 | test(15-03): add failing tests for CircularDependencyValidator |
| 3 (GREEN) | 145bd93 | feat(15-03): implement CircularDependencyValidator and integrate into AdminTemplateService |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Extended DynamicFieldWrapper with labelExtra and isConditionallyRequired**
- **Found during:** Task 1
- **Issue:** DynamicFieldWrapper did not support labelExtra or isConditionallyRequired props needed for calculation badge and conditional required indicator
- **Fix:** Added both props to DynamicFieldWrapper interface and rendering
- **Files modified:** DynamicFieldWrapper.tsx

**2. [Rule 2 - Missing] Added isConditionallyRequired prop to all field components**
- **Found during:** Task 1
- **Issue:** DynamicTextField, DynamicTextareaField, DynamicDateField, DynamicSelectField did not accept isConditionallyRequired
- **Fix:** Added prop to each component interface and passed through to DynamicFieldWrapper
- **Files modified:** DynamicTextField.tsx, DynamicTextareaField.tsx, DynamicDateField.tsx, DynamicSelectField.tsx

## Known Stubs

None - all runtime logic is fully wired to evaluateConditions and executeCalculation utilities with real form data.

## Threat Flags

None - T-15-06 (circular dep validation) and T-15-07 (hidden field filtering) are both mitigated as planned. No new network endpoints, auth paths, or trust boundary changes introduced.

## Self-Check: PASSED

- All 9 key files: FOUND
- All 4 commits: FOUND (cc7381c, d0d426a, 90a8e09, 145bd93)
