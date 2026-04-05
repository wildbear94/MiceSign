---
phase: 12-schema-foundation
plan: 03
subsystem: template-validation
tags: [dynamic-form-validation, schema-snapshot, field-types, backend]
dependency_graph:
  requires: [12-01, 12-02]
  provides: [dynamic-form-validator, schema-snapshot-on-create, field-level-error-messages]
  affects: [DocumentFormValidator, DocumentService, DocumentContent]
tech_stack:
  added: []
  patterns: [fallback-delegation, field-type-dispatch, schema-snapshot-on-write]
key_files:
  created:
    - backend/src/main/java/com/micesign/service/validation/DynamicFormValidator.java
    - backend/src/test/java/com/micesign/template/DynamicFormValidationTest.java
    - backend/src/test/java/com/micesign/template/SchemaSnapshotTest.java
  modified:
    - backend/src/main/java/com/micesign/service/DocumentFormValidator.java
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/test/java/com/micesign/document/DocumentFormValidatorTest.java
decisions:
  - Select field validation checks type only, not option membership (options can change)
  - staticText and hidden fields skip validation entirely (not user input)
  - Table cell errors use dot-notation key format (fieldId.rows[idx].colId)
metrics:
  duration: 6m 39s
  completed: 2026-04-05T02:50:42Z
  tasks_completed: 2
  tasks_total: 2
  test_count: 44
  files_changed: 6
---

# Phase 12 Plan 03: Dynamic Form Validation & Schema Snapshot Summary

DynamicFormValidator validates all 8 field types (text, textarea, number, date, select, table, staticText, hidden) with field-level Korean error messages, integrated into DocumentFormValidator via fallback delegation pattern. DocumentService saves resolved schema snapshots on document create/update.

## What Was Built

### Task 1: DynamicFormValidator + DocumentFormValidator Fallback
- **DynamicFormValidator** (`validation/DynamicFormValidator.java`): Loads template schema from DB, parses form_data JSON, validates each field by type with config-aware rules (maxLength, min/max, minRows/maxRows, date format). Table fields recursively validate cell columns. Errors collected as `Map<String, List<String>>` and thrown as `FormValidationException`.
- **DocumentFormValidator** modified: When no hardcoded `FormValidationStrategy` matches the template code, delegates to `DynamicFormValidator.validate()` instead of throwing `TPL_UNKNOWN`. Existing 6 hardcoded validators (GENERAL, EXPENSE, LEAVE, PURCHASE, BUSINESS_TRIP, OVERTIME) continue to work unchanged.
- Commit: `4bf6181`

### Task 2: DocumentService Schema Snapshot + Integration Tests
- **DocumentService** modified: `createDocument()` and `updateDocument()` now check if template has `schemaDefinition`; if so, saves `schemaVersion` and `schemaDefinitionSnapshot` (with resolved option set values) to `DocumentContent`.
- **DynamicFormValidationTest** (13 tests): Covers required field missing, maxLength exceeded, number min/max/non-numeric, date format, select pass-through, table minRows/maxRows/cell validation, staticText/hidden skip, all-valid pass, hardcoded template backward compatibility.
- **SchemaSnapshotTest** (3 tests): Verifies dynamic template creates snapshot with resolved options, hardcoded template has null snapshot, schema update doesn't alter existing document snapshots.
- **DocumentFormValidatorTest** updated: Constructor now accepts `DynamicFormValidator` mock; unknown template test verifies fallback delegation.
- Commit: `d44a77b`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated DocumentFormValidatorTest for new constructor signature**
- **Found during:** Task 2
- **Issue:** Existing `DocumentFormValidatorTest` used old constructor (without `DynamicFormValidator` parameter), causing compilation failure
- **Fix:** Added mock `DynamicFormValidator` to constructor call, updated "unknown template" test to verify fallback delegation instead of `TPL_UNKNOWN` exception
- **Files modified:** `backend/src/test/java/com/micesign/document/DocumentFormValidatorTest.java`
- **Commit:** `d44a77b`

## Pre-existing Issues Discovered

- `NotificationServiceTest.java` has compilation errors (references non-existent `resolveRecipients` method) -- pre-existing, not caused by this plan
- Several document integration tests (ApprovalLineIntegrationTest, ApprovalProcessIntegrationTest, DocumentRewriteTest, DocumentSubmitTest, DocumentWithdrawTest) fail due to foreign key constraint violations with `notification_log` table -- pre-existing test data cleanup issue

## Decisions Made

1. **Select validation: type-only, not value membership** -- Option sets can change after document creation, so we only verify the value is a string, not that it exists in the current option list.
2. **Table cell error key format**: `fieldId.rows[rowIdx].colId` -- enables frontend to map errors to specific table cells.
3. **staticText/hidden skip**: These fields are not user-editable, so no validation is applied regardless of required flag.

## Known Stubs

None -- all validation logic and snapshot saving are fully wired.

## Self-Check: PASSED

- All 6 key files verified present on disk
- Both commits (4bf6181, d44a77b) verified in git log
- 44 tests passing (13 DynamicFormValidation + 3 SchemaSnapshot + 28 DocumentFormValidator)
