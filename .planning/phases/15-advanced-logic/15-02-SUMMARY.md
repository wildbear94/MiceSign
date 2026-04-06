---
phase: 15-advanced-logic
plan: 02
subsystem: frontend-builder-ui
tags: [conditional-rules-ui, calculation-config, section-palette, circular-dep-check, property-panel]
dependency_graph:
  requires: [ConditionalRule, CalculationRule, detectCircularDeps, BuilderAction, BuilderState]
  provides: [PropertyConditionsTab, ConditionRuleCard, calculation-config-ui, section-palette-icon, circular-dep-save-guard]
  affects: [template-builder, runtime-integration]
tech_stack:
  added: []
  patterns: [tab-based-property-panel, condition-rule-card, grouped-checkbox-selection]
key_files:
  created:
    - frontend/src/features/admin/components/builder/PropertyConditionsTab.tsx
    - frontend/src/features/admin/components/builder/ConditionRuleCard.tsx
    - frontend/src/locales/ko/admin.json
  modified:
    - frontend/src/features/admin/components/builder/PropertyPanel.tsx
    - frontend/src/features/admin/components/builder/PropertyAdvancedTab.tsx
    - frontend/src/features/admin/components/builder/FieldPalette.tsx
    - frontend/src/features/admin/pages/TemplateBuilderPage.tsx
decisions:
  - "i18n locale JSON file created at frontend/src/locales/ko/admin.json with all condition/calculation/section keys"
  - "Condition rules use single-rule-per-field model with condition array inside"
  - "Calculation source fields presented as grouped checkboxes (number fields + table columns)"
metrics:
  duration: 4min
  completed: 2026-04-06T06:45:00Z
  tasks_completed: 2
  tasks_total: 2
  files_changed: 7
---

# Phase 15 Plan 02: Builder UI for Conditional Rules, Calculations, and Section Summary

Builder UI components for admin-facing conditional rule CRUD, number field calculation config with grouped source selection, section field in palette with Rows3 icon, and circular dependency validation blocking save.

## What Was Built

### Task 1: PropertyConditionsTab + ConditionRuleCard + PropertyPanel 4th tab + i18n
- Created `ConditionRuleCard` component with source field dropdown, operator dropdown (equals/not_equals/is_empty/is_not_empty), conditional value input (hidden for empty operators), and delete button
- Created `PropertyConditionsTab` component with matchType select (AND/OR), action select (show/hide/require), condition card list, add/remove condition logic, and empty state display
- Updated `PropertyPanel` to add 4th "Conditions" tab, expanded props interface with allFields/conditionalRules/calculationRules/onDispatch, added `section` to FIELD_TYPE_BADGES
- Created `frontend/src/locales/ko/admin.json` with 28 i18n keys for conditions, calculations, circular deps, and section

### Task 2: Calculation config in AdvancedTab + FieldPalette section + TemplateBuilderPage save logic
- Extended `PropertyAdvancedTab` with calculation config section visible only for number fields: operation select (SUM/ADD/MULTIPLY/COUNT), grouped source field checkboxes (number fields group + table column group)
- Added `Rows3` icon import and mapping in `FieldPalette` for the section palette item
- Updated `TemplateBuilderPage.handleSave` to call `detectCircularDeps` before saving and block save with alert if cycle found
- Updated save and export payloads to include `state.conditionalRules` and `state.calculationRules` instead of empty arrays
- Passed allFields, conditionalRules, calculationRules, and onDispatch props through to PropertyPanel

## Verification Results

- TypeScript compilation: PASS (zero errors)
- PropertyPanel Tab count: 4 (Basic, Validation, Advanced, Conditions)
- FieldPalette Rows3 icon: Present (import + mapping)
- TemplateBuilderPage detectCircularDeps: Imported and called before save
- FIELD_TYPE_BADGES includes section: Confirmed

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 3653d29 | feat(15-02): add PropertyConditionsTab, ConditionRuleCard, and 4th tab in PropertyPanel |
| 2 | 2add04d | feat(15-02): add calculation config, section palette icon, and circular dep check on save |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created i18n locale directory and file**
- **Found during:** Task 1
- **Issue:** `frontend/src/locales/ko/admin.json` did not exist and its parent directory was missing
- **Fix:** Created directory structure and JSON file with all required keys
- **Files created:** frontend/src/locales/ko/admin.json

## Known Stubs

None - all UI components are fully wired to builder state via dispatch actions and all i18n keys have Korean fallback values.

## Threat Flags

None - all changes are client-side UI components within the existing admin builder. No new network endpoints, auth paths, or trust boundary changes introduced. T-15-04 (frontend circular dep check bypass) is documented in the plan and mitigated by backend validation in Plan 03.

## Self-Check: PASSED

- All 7 files: FOUND
- All 2 commits: FOUND (3653d29, 2add04d)
