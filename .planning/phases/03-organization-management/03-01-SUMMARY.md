---
phase: 03-organization-management
plan: 01
subsystem: api
tags: [spring-boot, jpa, rest-api, rbac, mapstruct, integration-tests]

requires:
  - phase: 02-authentication
    provides: JWT auth filter, SecurityConfig with /api/v1/admin/** RBAC gate, CustomUserDetails
  - phase: 01-project-foundation
    provides: DB schema V1 with department/position/user tables, seed data, H2 test setup
provides:
  - Department/Position/User CRUD REST APIs under /api/v1/admin/
  - BusinessException + GlobalExceptionHandler error infrastructure
  - MapStruct mappers for entity-to-DTO conversion
  - UserSpecification for paginated filtering
affects:
  - 03-03 (frontend department/position management) — consumes department/position APIs
  - 03-04 (frontend user management) — consumes user management APIs

tech-stack:
  added: [mapstruct-mappers, jpa-specification, business-exception-handling]
  patterns: [tree-building-from-flat-list, depth-validation, circular-ref-detection, last-super-admin-protection]

key-files:
  created:
    - backend/src/main/java/com/micesign/domain/Department.java
    - backend/src/main/java/com/micesign/domain/Position.java
    - backend/src/main/java/com/micesign/repository/DepartmentRepository.java
    - backend/src/main/java/com/micesign/repository/PositionRepository.java
    - backend/src/main/java/com/micesign/dto/department/DepartmentTreeResponse.java
    - backend/src/main/java/com/micesign/dto/department/CreateDepartmentRequest.java
    - backend/src/main/java/com/micesign/dto/department/UpdateDepartmentRequest.java
    - backend/src/main/java/com/micesign/dto/department/DepartmentMemberResponse.java
    - backend/src/main/java/com/micesign/dto/position/PositionResponse.java
    - backend/src/main/java/com/micesign/dto/position/CreatePositionRequest.java
    - backend/src/main/java/com/micesign/dto/position/UpdatePositionRequest.java
    - backend/src/main/java/com/micesign/dto/position/ReorderPositionsRequest.java
    - backend/src/main/java/com/micesign/dto/user/UserListResponse.java
    - backend/src/main/java/com/micesign/dto/user/UserDetailResponse.java
    - backend/src/main/java/com/micesign/dto/user/CreateUserRequest.java
    - backend/src/main/java/com/micesign/dto/user/UpdateUserRequest.java
    - backend/src/main/java/com/micesign/mapper/DepartmentMapper.java
    - backend/src/main/java/com/micesign/mapper/PositionMapper.java
    - backend/src/main/java/com/micesign/mapper/UserMapper.java
    - backend/src/main/java/com/micesign/common/exception/BusinessException.java
    - backend/src/main/java/com/micesign/specification/UserSpecification.java
    - backend/src/main/java/com/micesign/service/DepartmentService.java
    - backend/src/main/java/com/micesign/service/PositionService.java
    - backend/src/main/java/com/micesign/service/UserManagementService.java
    - backend/src/main/java/com/micesign/controller/DepartmentController.java
    - backend/src/main/java/com/micesign/controller/PositionController.java
    - backend/src/main/java/com/micesign/controller/UserManagementController.java
    - backend/src/main/resources/db/migration/V4__add_unique_department_name.sql
    - backend/src/test/java/com/micesign/admin/TestTokenHelper.java
  modified:
    - backend/src/main/java/com/micesign/domain/User.java
    - backend/src/main/java/com/micesign/repository/UserRepository.java
    - backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java
    - backend/src/test/java/com/micesign/admin/DepartmentControllerTest.java
    - backend/src/test/java/com/micesign/admin/DepartmentServiceTest.java
    - backend/src/test/java/com/micesign/admin/PositionControllerTest.java
    - backend/src/test/java/com/micesign/admin/UserManagementControllerTest.java
    - backend/src/test/java/com/micesign/admin/UserManagementServiceTest.java
    - backend/src/test/java/com/micesign/admin/RbacEnforcementTest.java

decisions:
  - "Tree building via flat-list-to-recursive approach with Map-based parent lookup"
  - "TestTokenHelper component using real JwtTokenProvider for integration test auth"
  - "Read-only @ManyToOne on User for department/position — keeps existing Long ID setters for direct writes"

metrics:
  duration: 7min
  completed: 2026-04-02
  tasks: 3
  files: 38
---

# Phase 03 Plan 01: Backend Organization Management Summary

Complete REST API backend for organization management with full RBAC, hierarchy validation, and 30 passing integration tests.

## One-liner

Department tree API with depth/circular-ref validation, position CRUD with reorder, user management with RBAC and last-SUPER_ADMIN protection -- all via MapStruct-mapped DTOs and JPA Specification filtering.

## What Was Built

### Task 1: Entities, Repositories, V4 Migration
- **Department** JPA entity with self-referential `@ManyToOne parent` and `@OneToMany children`
- **Position** JPA entity with sort_order and active flag
- **User** entity updated with `@ManyToOne` read-only relationships to Department and Position
- **DepartmentRepository** with tree queries, member count aggregation
- **PositionRepository** with active user count query
- **UserRepository** extended with `JpaSpecificationExecutor` and admin query methods
- **V4 migration** adding unique constraints on department.name and position.name

### Task 2: DTOs, Mappers, Exception Infrastructure
- 12 DTO records across department, position, and user packages
- 3 MapStruct mappers (DepartmentMapper, PositionMapper, UserMapper with custom `isLocked` mapping)
- BusinessException with error code support
- GlobalExceptionHandler with BusinessException, validation, and generic error handlers
- UserSpecification for multi-field keyword/department/role/status filtering

### Task 3: Services, Controllers, Integration Tests
- **DepartmentService**: Tree building, depth validation (max 3 levels), circular reference detection, deactivation with child check, member listing, user count
- **PositionService**: CRUD, auto-increment sort_order, reorder, deactivation blocked by active users
- **UserManagementService**: RBAC enforcement (ADMIN cannot manage ADMIN+), last SUPER_ADMIN protection, self-deactivation block, paginated filtered list
- **3 REST controllers** under `/api/v1/admin/` with `@PreAuthorize` class-level security
- **TestTokenHelper** for generating role-specific JWT tokens in tests
- **30 integration tests** activated from Wave 0 stubs: 8 department, 4 department service, 5 position, 5 user management, 3 user service, 5 RBAC enforcement

## Error Codes Implemented

| Code | Trigger |
|------|---------|
| ORG_DUPLICATE_NAME | Department or position name already exists |
| ORG_NOT_FOUND | Entity not found by ID |
| ORG_DEPTH_EXCEEDED | Department hierarchy exceeds 3 levels |
| ORG_CIRCULAR_REF | Department parent set to own descendant |
| ORG_HAS_ACTIVE_CHILDREN | Deactivating department with active children |
| ORG_HAS_ACTIVE_USERS | Deactivating position with active users |
| ORG_LAST_SUPER_ADMIN | Demoting/deactivating sole SUPER_ADMIN |
| ORG_SELF_DEACTIVATION | User trying to deactivate themselves |
| AUTH_FORBIDDEN | ADMIN attempting to manage ADMIN+ roles |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed UnnecessaryStubbingException in UserManagementServiceTest**
- **Found during:** Task 3
- **Issue:** `departmentRepository.findById` was stubbed but never reached because ORG_LAST_SUPER_ADMIN exception fires before department validation
- **Fix:** Removed unnecessary stub from `lastSuperAdmin_cannotBeDemoted()` test
- **Files modified:** UserManagementServiceTest.java
- **Commit:** da9387d

**2. [Rule 2 - Missing] Added existsByEmailAndIdNot to UserRepository**
- **Found during:** Task 1
- **Issue:** Plan specified email uniqueness validation but UserRepository lacked the `existsByEmailAndIdNot` method needed for update validation
- **Fix:** Added `existsByEmailAndIdNot(String email, Long id)` to UserRepository
- **Commit:** ecce97b

## Known Stubs

None -- all APIs are fully wired to real database operations.

## Self-Check: PASSED
