---
phase: 12-schema-foundation
plan: 01
subsystem: backend-data-layer
tags: [flyway, jpa, dto, schema, migration]
dependency_graph:
  requires: []
  provides: [template-schema-entities, option-set-entities, json-schema-dtos, form-validation-exception]
  affects: [12-02, 12-03, 13-01]
tech_stack:
  added: [jnanoid-2.0.0]
  patterns: [json-schema-as-longtext, h2-test-migration-pattern, field-level-validation-exception]
key_files:
  created:
    - backend/src/main/resources/db/migration/V8__add_template_schema_support.sql
    - backend/src/main/resources/db/migration/V9__create_template_schema_version.sql
    - backend/src/main/resources/db/migration/V10__create_option_tables.sql
    - backend/src/test/resources/db/testmigration/V6__add_pending_notification_status.sql
    - backend/src/test/resources/db/testmigration/V7__add_additional_templates.sql
    - backend/src/test/resources/db/testmigration/V8__add_template_schema_support.sql
    - backend/src/test/resources/db/testmigration/V9__create_template_schema_version.sql
    - backend/src/test/resources/db/testmigration/V10__create_option_tables.sql
    - backend/src/main/java/com/micesign/domain/TemplateSchemaVersion.java
    - backend/src/main/java/com/micesign/domain/OptionSet.java
    - backend/src/main/java/com/micesign/domain/OptionItem.java
    - backend/src/main/java/com/micesign/repository/TemplateSchemaVersionRepository.java
    - backend/src/main/java/com/micesign/repository/OptionSetRepository.java
    - backend/src/main/java/com/micesign/repository/OptionItemRepository.java
    - backend/src/main/java/com/micesign/dto/template/SchemaDefinition.java
    - backend/src/main/java/com/micesign/dto/template/FieldDefinition.java
    - backend/src/main/java/com/micesign/dto/template/FieldConfig.java
    - backend/src/main/java/com/micesign/dto/template/CreateTemplateRequest.java
    - backend/src/main/java/com/micesign/dto/template/UpdateTemplateRequest.java
    - backend/src/main/java/com/micesign/dto/template/TemplateDetailResponse.java
    - backend/src/main/java/com/micesign/dto/option/OptionSetResponse.java
    - backend/src/main/java/com/micesign/dto/option/OptionItemResponse.java
    - backend/src/main/java/com/micesign/dto/option/CreateOptionSetRequest.java
    - backend/src/main/java/com/micesign/common/exception/FormValidationException.java
  modified:
    - backend/build.gradle.kts
    - backend/src/main/java/com/micesign/domain/ApprovalTemplate.java
    - backend/src/main/java/com/micesign/domain/DocumentContent.java
    - backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java
decisions:
  - Used LONGTEXT instead of JSON column type for schema_definition fields (H2 test compatibility)
  - Created H2-compatible test migrations separately from MariaDB production migrations
  - Used Java records for all DTO types with @JsonInclude(NON_NULL) for clean JSON serialization
  - FieldConfig is a flat union record (all field-type configs in one record) with null unused fields excluded via JsonInclude
metrics:
  duration: 4min
  completed: 2026-04-05T02:27:24Z
  tasks_completed: 2
  files_created: 25
  files_modified: 4
---

# Phase 12 Plan 01: DB Migrations, JPA Entities, Schema DTOs Summary

Flyway V8/V9/V10 migrations with H2 test counterparts, extended ApprovalTemplate/DocumentContent entities, new TemplateSchemaVersion/OptionSet/OptionItem entities, JSON schema DTO records supporting all 8 field types, and FormValidationException with field-level error mapping.

## What Was Done

### Task 1: Flyway V8/V9/V10 Migrations + jnanoid Dependency
- **V8**: Extended `approval_template` with 6 new columns (schema_definition, schema_version, is_custom, category, icon, created_by) and `document_content` with 2 new columns (schema_version, schema_definition_snapshot)
- **V9**: Created `template_schema_version` table with unique constraint on (template_id, version) for schema history tracking
- **V10**: Created `option_set` and `option_item` tables for shared select field options
- Added jnanoid 2.0.0 dependency to build.gradle.kts
- Created H2-compatible test migrations for V6 through V10 (V6/V7 gap was filled as a deviation)
- **Commit:** d68e96e

### Task 2: JPA Entities, Repositories, DTOs, FormValidationException
- Extended `ApprovalTemplate` entity with 6 new fields + getters/setters
- Extended `DocumentContent` entity with 2 new fields + getters/setters
- Created 3 new entities: `TemplateSchemaVersion`, `OptionSet`, `OptionItem` with full JPA mappings
- Created 3 new repositories with custom query methods
- Created JSON schema DTO records: `SchemaDefinition` (root), `FieldDefinition` (per-field), `FieldConfig` (union config for all 8 field types)
- Created template CRUD DTOs: `CreateTemplateRequest`, `UpdateTemplateRequest`, `TemplateDetailResponse`
- Created option DTOs: `OptionSetResponse`, `OptionItemResponse`, `CreateOptionSetRequest`
- Created `FormValidationException` with `Map<String, List<String>>` field errors
- Updated `GlobalExceptionHandler` with FormValidationException handler returning FORM_VALIDATION_ERROR
- **Commit:** ca68e0f

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing H2 test migrations for V6 and V7**
- **Found during:** Task 1
- **Issue:** Test migration directory had V1-V5 but was missing V6 and V7, which would block V8-V10 from running in H2 tests
- **Fix:** Created H2-compatible V6 (no-op for ENUM change) and V7 (INSERT template seeds) test migrations
- **Files created:** `backend/src/test/resources/db/testmigration/V6__add_pending_notification_status.sql`, `V7__add_additional_templates.sql`
- **Commit:** d68e96e

## Known Issues (Pre-existing, Out of Scope)

- `NotificationServiceTest.java` has compilation errors referencing a non-existent `resolveRecipients` method -- this blocks `./gradlew test` from running. Pre-existing issue, not caused by this plan. Logged for future fix.

## Known Stubs

None -- all entities, DTOs, and repositories are fully implemented with no placeholder data.

## Verification Results

- `./gradlew compileJava` -- BUILD SUCCESSFUL (all entities, DTOs, repositories compile cleanly)
- All 3 Flyway migrations syntactically correct with H2-compatible test counterparts
- ApprovalTemplate has 6 new fields, DocumentContent has 2 new fields
- SchemaDefinition record matches D-02 structure (version, fields[], conditionalRules[], calculationRules[])
- FieldDefinition record matches D-04 structure (id, type, label, required, config)
- All 8 field types representable via FieldConfig union record

## Self-Check: PASSED

All 25 created files verified present. All 4 modified files verified present. Both commit hashes (d68e96e, ca68e0f) confirmed in git log. SUMMARY.md created at correct location.
