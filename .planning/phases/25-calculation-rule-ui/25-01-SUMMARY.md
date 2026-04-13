---
phase: 25-calculation-rule-ui
plan: "01"
subsystem: frontend/admin/schema-field-editor
tags: [calculation-rule, types, utils, i18n, interface-first]
requires:
  - frontend/src/features/document/types/dynamicForm.ts::CalculationRule
  - frontend/src/features/document/utils/executeCalculations.ts (reference only, not modified)
provides:
  - PresetType, PresetConfig, CalcSource, CalcValidationError (types)
  - PRESET_OPTIONS, CALC_RESERVED_WORDS, CALC_TARGET_TYPES, CALC_SOURCE_ROOT_TYPES (constants)
  - extractDependencies, buildFormulaFromPreset, parseFormulaToPreset
  - validateFormula, getAvailableCalcSources
  - cleanupCalcRulesForDeletedField, cleanupCalcRulesForTypeChange, cleanupCalcRulesForTableColumnChange
  - renderFormulaFriendly
  - i18n keys: templates.calculation.* (ko/en)
affects:
  - Downstream plans 25-02 (CalculationRuleEditor component) and 25-03 (preview integration + save validation) depend on this contract layer
tech-stack:
  added: []
  patterns:
    - "Interface-first: types + utils before components"
    - "Source-synced regex (FIELD_REF_PATTERN) documented with comment referencing executeCalculations.ts:230"
    - "Mirror structure of conditionalRuleUtils.ts (Phase 24 pattern)"
key-files:
  created:
    - frontend/src/features/admin/components/SchemaFieldEditor/calculationRuleUtils.ts
  modified:
    - frontend/src/features/admin/components/SchemaFieldEditor/types.ts
    - frontend/src/features/admin/components/SchemaFieldEditor/constants.ts
    - frontend/public/locales/ko/admin.json
    - frontend/public/locales/en/admin.json
decisions:
  - "extractDependencies regex duplicated (not imported) from executeCalculations.ts to keep runtime file untouched"
  - "parseFormulaToPreset uses strict matching; mismatches fall back to 'custom' preset"
  - "validateFormula performs early self-reference detection before delegating circular check to detectCircularDeps at save time"
metrics:
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 4
  duration: ~6 min
  completed_date: 2026-04-13
---

# Phase 25 Plan 01: Calculation Rule Foundation (Types/Constants/Utils/i18n) Summary

**One-liner:** Interface-first contract layer for calculation rule UI — helper types, preset constants, pure-function utils (parse/build/validate/cascade/render), and ko/en i18n keys — enabling parallel execution of downstream plans 25-02 and 25-03.

## What Was Built

**Task 1 — types.ts / constants.ts / i18n extension**
- Added `PresetType`, `PresetConfig`, `CalcSource`, `CalcValidationError` to `SchemaFieldEditor/types.ts`.
- Added `CALC_TARGET_TYPES`, `CALC_SOURCE_ROOT_TYPES`, `CALC_RESERVED_WORDS`, `PresetOption` interface, and `PRESET_OPTIONS` (4 presets) to `SchemaFieldEditor/constants.ts`.
- Added `templates.calculation.*` namespace to both `ko/admin.json` and `en/admin.json` with sectionTitle, noRule, addRule, presets (sumCol/sumMul/fieldSum/ratio + example keys + dropdown labels), errors (6 categories), and misc UI labels (advancedPlaceholder, circularSaveBlocked, rulesAutoRemoved, targetBadgePrefix).
- Commit: `5822ea7`

**Task 2 — calculationRuleUtils.ts (new)**
- Created `SchemaFieldEditor/calculationRuleUtils.ts` exporting 9 functions:
  - `extractDependencies(formula)` — regex-based ref extraction with lastIndex reset (T-25-02 mitigation).
  - `buildFormulaFromPreset(preset)` — 5-case switch producing executeCalculations-compatible strings.
  - `parseFormulaToPreset(formula)` — reverse parser with strict matching, 'custom' fallback.
  - `validateFormula(formula, fields, targetFieldId)` — paren matching + self-ref + unknownField/unknownColumn.
  - `getAvailableCalcSources(targetFieldId, fields)` — root number + table number columns.
  - `cleanupCalcRulesForDeletedField` / `cleanupCalcRulesForTypeChange` / `cleanupCalcRulesForTableColumnChange` — three cascade helpers returning `[cleanedRules, removedCount]`.
  - `renderFormulaFriendly(formula)` — `*` → `×`, `/` → `÷` for display.
- `FIELD_REF_PATTERN` duplicated from `executeCalculations.ts:230` with `Source-synced` comment (T-25-01 mitigation).
- Commit: `3f8072b`

## Verification

- `npx tsc --noEmit` passes (zero errors).
- `git diff --stat` confirms `executeCalculations.ts` and `detectCircularDeps.ts` untouched.
- All 9 required exports present.
- PRESET_OPTIONS contains all 4 preset types (`sum-col`, `sum-mul`, `field-sum`, `ratio`).
- i18n keys present in both ko and en: `templates.calculation.sectionTitle`, `.errors.circularDependency`, etc.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None. Threats T-25-01 (regex drift) and T-25-02 (regex lastIndex) mitigated as planned:
- T-25-01: `Source-synced with executeCalculations.ts:230` comment + identical pattern.
- T-25-02: `FIELD_REF_PATTERN.lastIndex = 0` at start of `extractDependencies`.

## Known Stubs

None. All exports are fully implemented pure functions.

## Self-Check: PASSED

- FOUND: frontend/src/features/admin/components/SchemaFieldEditor/calculationRuleUtils.ts
- FOUND: frontend/src/features/admin/components/SchemaFieldEditor/types.ts (extended)
- FOUND: frontend/src/features/admin/components/SchemaFieldEditor/constants.ts (extended)
- FOUND: frontend/public/locales/ko/admin.json (extended)
- FOUND: frontend/public/locales/en/admin.json (extended)
- FOUND: commit 5822ea7
- FOUND: commit 3f8072b
- VERIFIED: executeCalculations.ts and detectCircularDeps.ts unchanged
- VERIFIED: `npx tsc --noEmit` exits 0
