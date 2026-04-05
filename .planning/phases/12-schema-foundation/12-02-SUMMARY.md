---
phase: 12-schema-foundation
plan: "02"
subsystem: template-api
tags: [template-crud, schema-versioning, option-set, rest-api, rbac]
dependency_graph:
  requires: [12-01]
  provides: [template-crud-api, option-set-api, schema-version-management]
  affects: [14-builder-ui, document-creation]
tech_stack:
  added: [jnanoid-nanoid-generation]
  patterns: [mapstruct-dto-mapping, service-layer-delegation, append-only-versioning]
key_files:
  created:
    - backend/src/main/java/com/micesign/service/TemplateSchemaService.java
    - backend/src/main/java/com/micesign/service/OptionSetService.java
    - backend/src/main/java/com/micesign/controller/OptionSetController.java
    - backend/src/main/java/com/micesign/mapper/OptionSetMapper.java
    - backend/src/test/java/com/micesign/template/TemplateApiIntegrationTest.java
    - backend/src/test/java/com/micesign/template/OptionSetApiIntegrationTest.java
  modified:
    - backend/src/main/java/com/micesign/service/TemplateService.java
    - backend/src/main/java/com/micesign/controller/TemplateController.java
    - backend/src/main/java/com/micesign/mapper/TemplateMapper.java
    - backend/src/main/java/com/micesign/dto/template/TemplateResponse.java
    - backend/src/main/java/com/micesign/repository/ApprovalTemplateRepository.java
    - backend/src/main/java/com/micesign/repository/OptionSetRepository.java
    - backend/src/test/resources/db/testmigration/V10__create_option_tables.sql
decisions:
  - "Template code auto-generated as CUSTOM_{nanoid12} to prevent collision"
  - "TemplateController serves both /templates (public) and /admin/templates (admin) under /api/v1"
  - "Template must be persisted before schema version to satisfy FK constraint"
  - "MapStruct @Mapping(source='active/custom') resolves boolean getter naming mismatch"
metrics:
  duration: "7m 14s"
  completed: "2026-04-05T02:39:13Z"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 11
  files_changed: 13
---

# Phase 12 Plan 02: Template CRUD API and Schema Version Management Summary

Template CRUD REST API with RBAC, schema version auto-increment on update, and option set management endpoints -- all backed by 11 integration tests.

## Task Completion

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | TemplateSchemaService + OptionSetService + OptionSetController + Mappers | 8e9dd0c | TemplateSchemaService.java, OptionSetService.java, OptionSetController.java, OptionSetMapper.java |
| 2 | TemplateService CRUD + TemplateController + Tests | 4b6d38a | TemplateService.java, TemplateController.java, 2 integration test files |

## What Was Built

### TemplateSchemaService
- `updateSchema()`: Serializes SchemaDefinition to JSON, auto-increments version, saves to template_schema_version (append-only), updates template's current schema
- `resolveSchemaWithOptions()`: Resolves select field optionSetId references to actual option items for document snapshot creation
- `getVersionHistory()`: Retrieves schema version history for a template (ordered by version desc)

### OptionSetService + OptionSetController
- POST /api/v1/admin/option-sets -- create option set with items (duplicate name validation)
- GET /api/v1/admin/option-sets -- list active option sets
- GET /api/v1/admin/option-sets/{id} -- get option set detail with items
- All endpoints protected with `@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")`

### TemplateService CRUD
- `createTemplate()`: Validates prefix uniqueness, generates CUSTOM_{nanoid12} code, persists template then creates schema version 1
- `updateTemplate()`: Updates metadata fields, auto-increments schema version when schemaDefinition changes
- `deactivateTemplate()`: Soft-deletes custom templates only (hardcoded templates protected)
- `getTemplateDetail()`: Returns full detail with deserialized SchemaDefinition
- `getAllTemplates()`: Admin-only full list
- `getActiveTemplates()`: Existing API preserved for backward compatibility

### TemplateController Extension
- Existing GET /api/v1/templates preserved (backward compatible)
- New admin endpoints at /api/v1/admin/templates (POST, GET, GET/{id}, PUT/{id}, DELETE/{id})
- All admin endpoints require ADMIN or SUPER_ADMIN role

### TemplateResponse Extension
- Added isCustom, category, icon fields to support admin template listing

### Integration Tests (11 total)
- TemplateApiIntegrationTest (7 tests): create with CUSTOM_ code, duplicate prefix rejection, schema version increment on update, detail with schema, deactivation, 403 for USER role, backward compat
- OptionSetApiIntegrationTest (4 tests): create, list, duplicate name rejection, get by ID

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Template must be persisted before schema version save**
- **Found during:** Task 2 (test failure: TransientPropertyValueException)
- **Issue:** TemplateSchemaVersion has FK to ApprovalTemplate; saving schema version before template causes "transient instance" error
- **Fix:** Reordered to `approvalTemplateRepository.save(template)` before `schemaService.updateSchema()`
- **Files modified:** TemplateService.java
- **Commit:** 4b6d38a

**2. [Rule 3 - Blocking] H2 reserved keyword 'value' in V10 test migration**
- **Found during:** Task 2 (all tests failing: FlywaySqlScriptException)
- **Issue:** `value` is a reserved keyword in H2; V10 test migration used unquoted `value` column name
- **Fix:** Quoted `"value"` in CREATE TABLE and UNIQUE constraint
- **Files modified:** V10__create_option_tables.sql (test migration only)
- **Commit:** 4b6d38a

**3. [Rule 1 - Bug] MapStruct boolean getter mapping for isActive/isCustom**
- **Found during:** Task 1 (compile warnings for unmapped properties)
- **Fix:** Added `@Mapping(source = "active", target = "isActive")` annotations to OptionSetMapper and TemplateMapper
- **Files modified:** OptionSetMapper.java, TemplateMapper.java
- **Commit:** 8e9dd0c, 4b6d38a

## Known Stubs

None -- all endpoints are fully wired to service layer and database.

## Self-Check: PASSED

All 8 key files verified present. Both commit hashes (8e9dd0c, 4b6d38a) found. 11 integration tests passing.
