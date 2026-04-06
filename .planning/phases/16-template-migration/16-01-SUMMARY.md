---
phase: 16-template-migration
plan: 01
title: "Backend Schema Seeding & Dynamic Template Pipeline"
subsystem: backend
tags: [template, schema, migration, validation, tdd]
dependency_graph:
  requires: []
  provides: [template-schemas, dynamic-validation, schema-snapshot]
  affects: [document-creation, document-detail-api]
tech_stack:
  added: []
  patterns: [dynamic-schema-fallback-validation, schema-snapshot-on-create]
key_files:
  created:
    - backend/src/test/java/com/micesign/template/TemplateSchemaTest.java
    - backend/src/main/resources/db/migration/V6__add_template_schema_columns.sql
    - backend/src/main/resources/db/migration/V7__add_additional_templates.sql
    - backend/src/main/resources/db/migration/V8__add_document_content_schema_columns.sql
    - backend/src/main/resources/db/migration/V9__seed_legacy_template_schemas.sql
    - backend/src/test/resources/db/testmigration/V6__add_template_schema_columns.sql
    - backend/src/test/resources/db/testmigration/V7__add_additional_templates.sql
    - backend/src/test/resources/db/testmigration/V8__add_document_content_schema_columns.sql
    - backend/src/test/resources/db/testmigration/V9__seed_legacy_template_schemas.sql
  modified:
    - backend/src/main/java/com/micesign/domain/ApprovalTemplate.java
    - backend/src/main/java/com/micesign/domain/DocumentContent.java
    - backend/src/main/java/com/micesign/service/DocumentFormValidator.java
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/main/java/com/micesign/dto/document/DocumentDetailResponse.java
    - backend/src/main/java/com/micesign/mapper/DocumentMapper.java
    - backend/src/test/java/com/micesign/document/DocumentFormValidatorTest.java
decisions:
  - "V9 migration numbering (plan referenced V12 but actual available slot was V9)"
  - "Prerequisite V6/V7/V8 migrations created since they were missing from codebase"
  - "Removed broken AdminTemplateService.java leftover from reverted phase"
metrics:
  duration: 7min
  completed: "2026-04-06T08:16:57Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 9
  files_modified: 7
---

# Phase 16 Plan 01: Backend Schema Seeding & Dynamic Template Pipeline Summary

6개 레거시 템플릿에 JSON 스키마를 시드하고, 동적 템플릿의 백엔드 파이프라인(밸리데이션, 스냅샷 저장, DTO 반환)을 완성함

## What Was Done

### Task 1: Wave 0 -- TemplateSchemaTest (TDD RED)
- 6개 템플릿(GENERAL, EXPENSE, LEAVE, PURCHASE, BUSINESS_TRIP, OVERTIME) 각각의 필드 수/타입/라벨을 검증하는 통합 테스트 생성
- V6(schema 컬럼 추가), V7(추가 템플릿 3종), V8(document_content schema 컬럼) 선행 마이그레이션 생성 (Rule 3 deviation)
- ApprovalTemplate 엔티티에 schemaDefinition/schemaVersion 필드 매핑 추가
- 깨진 AdminTemplateService.java 제거 (이전 phase에서 revert된 잔존 파일)
- Commit: f27990f

### Task 2: V9 시드 마이그레이션 (TDD GREEN)
- 6개 템플릿 모두에 대한 JSON schema_definition을 V9 Flyway 마이그레이션으로 시드
- GENERAL(2 fields), EXPENSE(4 fields + calculationRules), LEAVE(8 fields + conditionalRules), PURCHASE(5 fields + calculationRules), BUSINESS_TRIP(8 fields + calculationRules), OVERTIME(6 fields)
- TemplateSchemaTest 6개 테스트 모두 GREEN 통과
- Commit: c91c23d

### Task 3: 백엔드 파이프라인 완성
- DocumentContent 엔티티: schemaVersion, schemaDefinitionSnapshot JPA 필드 추가
- DocumentFormValidator: 4-parameter validate 메서드로 변경, default 케이스에 동적 스키마 폴백 밸리데이션 추가
- DocumentService: createDocument에서 스키마 스냅샷 저장, updateDocument에서 schemaDefinition 전달
- DocumentDetailResponse: schemaDefinitionSnapshot 필드 추가
- DocumentMapper: schemaDefinitionSnapshot 매핑 추가
- DocumentFormValidatorTest: 모든 호출을 4-parameter로 업데이트
- 전체 백엔드 테스트 통과 (회귀 없음)
- Commit: 428065f

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing prerequisite migrations V6/V7/V8**
- **Found during:** Task 1
- **Issue:** Plan referenced V7__add_additional_templates.sql, V8__add_template_schema_support.sql, V11__seed_dynamic_template.sql but none existed. approval_template had no schema_definition/schema_version columns, and PURCHASE/BUSINESS_TRIP/OVERTIME templates didn't exist.
- **Fix:** Created V6 (schema columns on approval_template), V7 (3 additional templates), V8 (schema columns on document_content) for both main and test migration paths. Updated ApprovalTemplate entity with new fields.
- **Files created:** V6, V7, V8 migrations (main + test = 6 files), ApprovalTemplate.java modified
- **Commit:** f27990f

**2. [Rule 3 - Blocking] Broken AdminTemplateService.java preventing compilation**
- **Found during:** Task 1
- **Issue:** AdminTemplateService referenced non-existent DTO classes (AdminTemplateDetailResponse, AdminTemplateResponse, CreateTemplateRequest, UpdateTemplateRequest) and non-existent entity methods (setCategory, setIcon, isCustom, setCustom). This was a leftover from a reverted phase.
- **Fix:** Removed the broken file. No other code depended on it.
- **Files modified:** AdminTemplateService.java (deleted)
- **Commit:** f27990f

**3. [Rule 1 - Bug] DocumentFormValidatorTest compilation failure**
- **Found during:** Task 3
- **Issue:** Changing validate signature from 3 to 4 parameters broke all existing test calls.
- **Fix:** Updated all test calls to pass null as 4th parameter (schemaDefinition).
- **Files modified:** DocumentFormValidatorTest.java
- **Commit:** 428065f

**4. Migration numbering V9 instead of V12**
- **Found during:** Task 2
- **Issue:** Plan specified V12 but the actual next available migration number was V9 (after V6/V7/V8 prerequisites).
- **Fix:** Used V9 for the schema seed migration.
- **Files created:** V9__seed_legacy_template_schemas.sql
- **Commit:** c91c23d

## Known Stubs

None. All schema definitions contain complete field structures with proper labels, types, configs, and rules.

## Self-Check: PASSED

All 9 created files verified present. All 3 commit hashes verified in git log.
