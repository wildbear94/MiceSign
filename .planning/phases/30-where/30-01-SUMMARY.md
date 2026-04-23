---
phase: 30-where
plan: 01
subsystem: api
tags: [spring-boot, querydsl, record, exception-handling, enum-binding, validation]

requires:
  - phase: 29-smtp-retrofit
    provides: existing DocumentSearchCondition record (6 fields) + DocumentRepositoryCustomImpl (KAT filter)
provides:
  - DocumentSearchCondition 7-field record with List<DocumentStatus> statuses + Long drafterId
  - DocumentController.searchDocuments new signature (repeat status params + manual enum conversion)
  - DocumentController.getMyDocuments compatibility shim (new 7-arg constructor)
  - GlobalExceptionHandler.handleTypeMismatch (400 VALIDATION_ERROR for Long/int/LocalDate binding failures)
  - DocumentRepositoryCustomImpl temporary filter ready for Plan 30-02 permission predicate + DRAFT gate
  - 4 test files with 12 @Test methods green (Condition 4 + InvalidEnum 5 + Keyword 1 scaffold + StatusFilter 2 scaffold)
affects: [30-02, 30-03, 30-04]

tech-stack:
  added: []
  patterns:
    - "Option A: manual enum conversion in controller with try-catch → BusinessException VALIDATION_ERROR"
    - "Option B: MethodArgumentTypeMismatchException handler for auto-binding failures (Long/int/LocalDate)"
    - "Record compact constructor for null → emptyList defensive default"
    - "Wave 0 test scaffold pattern: smoke @Test with comment list of follow-up tests for next plan"

key-files:
  created:
    - backend/src/test/java/com/micesign/document/DocumentSearchConditionTest.java
    - backend/src/test/java/com/micesign/document/DocumentSearchInvalidEnumTest.java
    - backend/src/test/java/com/micesign/document/DocumentSearchKeywordTest.java
    - backend/src/test/java/com/micesign/document/DocumentSearchStatusFilterTest.java
  modified:
    - backend/src/main/java/com/micesign/dto/document/DocumentSearchCondition.java
    - backend/src/main/java/com/micesign/controller/DocumentController.java
    - backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java
    - backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java

key-decisions:
  - "D-B4: record 필드 순서 — (keyword, statuses, templateCode, dateFrom, dateTo, tab, drafterId) 로 확정. getMyDocuments 호환 수정 포함."
  - "Pitfall 2 이중 방어: (a) Controller 수동 valueOf + try-catch (Option A) + (b) GlobalExceptionHandler.handleTypeMismatch (Option B) 동시 적용"
  - "Pitfall 9: Controller rawStatuses.stream().filter(s -> !s.isBlank()) + record compact constructor Collections.emptyList → null/빈값 모두 필터링"
  - "Repository 임시 수정 범위 최소화: L69-70 statuses.in + drafterId.eq 만 교체 — Plan 30-02 가 권한 predicate + DRAFT gate + countDistinct 로 재작성"
  - "DRAFT gate 및 권한 predicate 는 PR1 hotfix 로 배포 전 Plan 30-02 필수 — Plan 30-01 단독으로는 보안 사고 미수정"

patterns-established:
  - "Manual enum binding with VALIDATION_ERROR mapping — defend Controller from binding failures without relying on MethodArgumentTypeMismatchException alone"
  - "TypeMismatch handler placement — right after handleValidation(MethodArgumentNotValidException) for symmetric coverage"
  - "Compact constructor normalization — statuses = null → Collections.emptyList so callers never NPE"
  - "Wave 0 scaffold test — commented TODOs list future test names so Plan 02 author knows the shape"

requirements-completed: [SRCH-02, SRCH-03]

duration: 6min
completed: 2026-04-23
---

# Phase 30 Plan 01: DocumentSearch record 개편 + Controller 시그니처 + Exception Handler Summary

**PR1 hotfix 기반 마련 — record/controller/exception handler 변경으로 T-30-03 (500 stack trace 유출) 차단, Plan 30-02가 권한 predicate + DRAFT gate 를 주입할 수 있는 컴파일 통과 스키마 확정.**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-04-23T13:58:54Z
- **Tasks:** 1 (atomic — 6개 서브 스텝 통합)
- **Files modified:** 8 (main 4 + test 4)

## Accomplishments

- `DocumentSearchCondition` record가 `List<DocumentStatus> statuses` + `Long drafterId` 7-field로 확장되고 compact constructor로 null → emptyList 정규화
- `DocumentController.searchDocuments`가 repeat `?status=A&status=B` 파라미터를 `List<String>` 수신 후 수동 `DocumentStatus.valueOf` + try-catch로 변환하여 `BusinessException("VALIDATION_ERROR", 400)` 반환 (T-30-03 완화)
- `DocumentController.getMyDocuments`가 새 7-arg 생성자 시그니처로 컴파일 통과하며 기존 동작 보존 (D-D7 회귀 없음)
- `GlobalExceptionHandler.handleTypeMismatch`가 `drafterId=notanumber` / `page=abc` / `dateFrom=invalid` 등 자동 바인딩 실패를 400 VALIDATION_ERROR로 변환 (Option A + Option B 이중 방어)
- `DocumentRepositoryCustomImpl` L69-72가 `statuses.in()` + `drafterId.eq()` 임시 참조로 전환 (Plan 30-02가 권한 predicate + DRAFT gate + countDistinct로 재작성)
- 4개 테스트 파일로 12개 @Test green: `DocumentSearchConditionTest` (4 record 유닛) + `DocumentSearchInvalidEnumTest` (5 통합: invalid enum 400 / 복수 status 200 / blank status 200 / tab=all+USER 403 / invalid drafterId 타입 400) + `DocumentSearchKeywordTest` 스캐폴드 (1) + `DocumentSearchStatusFilterTest` 스캐폴드 (2)

## Task Commits

Task 1은 원자 단위 — 1개 커밋:

1. **Task 1: record 개편 + Controller 시그니처 + Repository 임시 + ExceptionHandler + 테스트 4개** — `9c9964a` (fix)

이유: Java 컴파일 의존성 chain으로 얽혀 있어 **분리하면 어떤 단계도 단독 green 불가** (record 필드 순서 변경 → Controller L66-67/L137-138 + Repository L69-70 즉시 컴파일 에러). BLOCKER 2 응답으로 Option A 채택.

## Files Created/Modified

**Created:**
- `backend/src/test/java/com/micesign/document/DocumentSearchConditionTest.java` — record 유닛 테스트 4개 (statuses null→empty / list preserved / drafterId nullable / tab case-preserve)
- `backend/src/test/java/com/micesign/document/DocumentSearchInvalidEnumTest.java` — MockMvc 통합 테스트 5개 (INVALID_ENUM_VALUE 400 VALIDATION_ERROR + stack trace 미포함 / 복수 valid 200 / blank status 200 / tab=all+USER 403 / drafterId=not-a-number 400)
- `backend/src/test/java/com/micesign/document/DocumentSearchKeywordTest.java` — Wave 0 스캐폴드 (emptyKeyword smoke, Plan 02가 title/docNumber/drafter.name OR + SQL injection escape 채움)
- `backend/src/test/java/com/micesign/document/DocumentSearchStatusFilterTest.java` — Wave 0 스캐폴드 (복수 status 200 + 단일 역호환 200, Plan 02가 twoStatuses_filtersExactMatch + noStatusParam_includesAllNonDraft 채움)

**Modified:**
- `backend/src/main/java/com/micesign/dto/document/DocumentSearchCondition.java` — 6-field → 7-field record (+ DocumentStatus import, Collections.emptyList compact constructor)
- `backend/src/main/java/com/micesign/controller/DocumentController.java` — searchDocuments 시그니처 개편 + getMyDocuments 7-arg 호환 + 수동 enum 변환 try-catch
- `backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java` — handleTypeMismatch 핸들러 추가 (MethodArgumentNotValidException 바로 아래)
- `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` — L69-72 status.eq → statuses.in + drafterId.eq 임시 교체 (unused DocumentStatus/JPAExpressions import 정리)

## Verification Results

`./gradlew compileJava compileTestJava` — BUILD SUCCESSFUL (1 warning pre-existing from ApprovalServiceAuditTest @MockBean deprecation, unrelated)

`./gradlew test --tests 'com.micesign.document.DocumentSearch*'` — BUILD SUCCESSFUL, **12 tests / 0 failures / 0 errors**
- DocumentSearchConditionTest: 4 tests
- DocumentSearchInvalidEnumTest: 5 tests
- DocumentSearchKeywordTest: 1 test
- DocumentSearchStatusFilterTest: 2 tests

**회귀 체크:** `com.micesign.document.ApprovalWorkflowTest`에서 3개 pre-existing 실패 (`approveDocument_success`, `rejectDocument_withComment`, `rewriteDocument_success`) 관찰 — 모두 `ApprovalEmailSender.persistLog`의 `ObjectOptimisticLockingFailureException` (NotificationLog#N) 기인. Plan 30-01 이전에도 동일하게 발생 (stash 후 재현 확인). Phase 29 SMTP retrofit 이슈이며 **Phase 30-01 회귀가 아님**.

## Deviations from Plan

**[Rule 1 - bug] Unused imports cleanup** — Found during: Task 1-5 | Issue: DocumentStatus import가 repository의 valueOf 참조 삭제로 미사용 + 기존에 이미 있던 JPAExpressions 미사용 경고 | Fix: 두 import 모두 제거 (JPAExpressions는 Plan 30-02가 EXISTS 서브쿼리용으로 재추가 예정) | Files: DocumentRepositoryCustomImpl.java | Verification: `./gradlew compileJava` clean (approvalLine local 경고만 pre-existing) | Commit: 9c9964a

**Total deviations:** 1 auto-fixed. **Impact:** 코드 품질 개선 — Plan 30-02가 필요 시 import 재추가.

## Issues Encountered

None — Plan 01 단독으로는 green. 주의: PR1 hotfix 배포 가능 여부는 Plan 30-02 완료 후 (권한 predicate + DRAFT gate + countDistinct).

## Plan 30-02 로 넘길 인터페이스

- 새 record 생성자 인자 순서: `new DocumentSearchCondition(keyword, statuses, templateCode, dateFrom, dateTo, tab, drafterId)`
- Repository 임시 블록 위치: `DocumentRepositoryCustomImpl.java` L68-73 (`condition.statuses().in` + `condition.drafterId().eq`) — Plan 02가 그 **앞에** 권한 predicate (본인 OR EXISTS approval_line OR (ADMIN AND dept) OR SUPER_ADMIN) + tab!='my' DRAFT gate 삽입
- Wave 0 스캐폴드 테스트 (`DocumentSearchKeywordTest` + `DocumentSearchStatusFilterTest`)는 TODO 주석에 Plan 02 추가 테스트 이름 명시

## Next

Ready for Plan 30-02: 권한 predicate + DRAFT gate + countDistinct + 28 케이스 권한 매트릭스 통합 테스트 (BOLA/DRAFT 유출 T-30-01/02 해소 → PR1 hotfix 머지 가능).
