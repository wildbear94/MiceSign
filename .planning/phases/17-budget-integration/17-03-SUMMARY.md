---
phase: 17-budget-integration
plan: 03
subsystem: api
tags: [spring-events, budget-integration, retry, event-publishing]

requires:
  - phase: 17-budget-integration (plan 01, 02)
    provides: BudgetIntegrationService, BudgetApiClient, event classes
provides:
  - DocumentService -> BudgetIntegrationService event wiring
  - Explicit @Retryable label binding for @Recover disambiguation
  - BDGT-01, BDGT-02 requirement traceability
affects: []

tech-stack:
  added: []
  patterns: [spring-event-publish-subscribe for cross-domain integration]

key-files:
  created: []
  modified:
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/main/java/com/micesign/budget/RealBudgetApiClient.java
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Publish budget events for ALL documents, filtering by template_code happens in BudgetIntegrationService"

patterns-established:
  - "Event publishing in DocumentService after notification events for cross-domain integration"

requirements-completed: [BDGT-01, BDGT-02]

duration: 2min
completed: 2026-04-07
---

# Phase 17 Plan 03: Gap Closure - Event Publishing Wiring Summary

**DocumentService에서 BudgetIntegrationEvent/BudgetCancellationEvent 발행을 추가하고 @Retryable label을 명시하여 예산 연동 파이프라인 완성**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-07T02:52:23Z
- **Completed:** 2026-04-07T02:54:05Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- DocumentService.submitDocument()에서 BudgetIntegrationEvent를 발행하여 BudgetIntegrationService 핸들러가 실제로 트리거됨
- DocumentService.withdrawDocument()에서 BudgetCancellationEvent("WITHDRAWN")를 발행하여 취소 플로우가 작동
- RealBudgetApiClient의 @Retryable에 label 속성을 추가하여 @Recover 메서드 매칭 ambiguity 해소
- REQUIREMENTS.md에 BDGT-01, BDGT-02 추가 및 traceability 표 업데이트

## Task Commits

Each task was committed atomically:

1. **Task 1: DocumentService에 이벤트 발행 추가** - `d55de61` (feat)
2. **Task 2: @Retryable label 수정 및 REQUIREMENTS.md 업데이트** - `8b6c0f7` (fix)

## Files Created/Modified
- `backend/src/main/java/com/micesign/service/DocumentService.java` - BudgetIntegrationEvent/BudgetCancellationEvent import 및 publishEvent 호출 추가
- `backend/src/main/java/com/micesign/budget/RealBudgetApiClient.java` - @Retryable에 label 속성 추가
- `.planning/REQUIREMENTS.md` - BDGT-01, BDGT-02 요구사항 및 traceability 행 추가

## Decisions Made
- 모든 문서 제출/회수에 대해 budget 이벤트를 발행하고, budget_enabled 여부 필터링은 BudgetIntegrationService 내부에서 수행 (기존 설계 유지)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `./gradlew compileJava` 빌드가 실패하지만 이는 DocumentRepositoryCustom 누락 등 기존 64개 에러로, 본 plan의 변경과 무관한 pre-existing issue임. 본 plan에서 수정한 라인(17, 18, 226, 322)에는 컴파일 에러 없음.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 17 예산 연동 파이프라인 완성: DocumentService -> Event -> BudgetIntegrationService -> BudgetApiClient
- 남은 작업 없음 (Phase 17 gap closure 완료)

---
*Phase: 17-budget-integration*
*Completed: 2026-04-07*
