---
phase: 17-budget-integration
plan: 01
subsystem: backend
tags: [budget, integration, infrastructure, retry, flyway]
dependency_graph:
  requires: []
  provides: [budget-api-client, budget-data-extractor, budget-integration-log, budget-events]
  affects: [approval-template, user-repository]
tech_stack:
  added: [spring-retry, spring-boot-starter-aop]
  patterns: [strategy-pattern, profile-based-bean-selection, retryable-api-calls]
key_files:
  created:
    - backend/src/main/resources/db/migration/V12__add_budget_integration.sql
    - backend/src/main/java/com/micesign/domain/BudgetIntegrationLog.java
    - backend/src/main/java/com/micesign/repository/BudgetIntegrationLogRepository.java
    - backend/src/main/java/com/micesign/config/RetryConfig.java
    - backend/src/main/java/com/micesign/config/BudgetApiConfig.java
    - backend/src/main/java/com/micesign/event/BudgetIntegrationEvent.java
    - backend/src/main/java/com/micesign/event/BudgetCancellationEvent.java
    - backend/src/main/java/com/micesign/budget/BudgetExpenseRequest.java
    - backend/src/main/java/com/micesign/budget/BudgetCancellationRequest.java
    - backend/src/main/java/com/micesign/budget/BudgetApiResponse.java
    - backend/src/main/java/com/micesign/budget/BudgetApiClient.java
    - backend/src/main/java/com/micesign/budget/MockBudgetApiClient.java
    - backend/src/main/java/com/micesign/budget/RealBudgetApiClient.java
    - backend/src/main/java/com/micesign/budget/BudgetDataExtractor.java
  modified:
    - backend/build.gradle.kts
    - backend/src/main/resources/application.yml
    - backend/src/main/java/com/micesign/domain/ApprovalTemplate.java
    - backend/src/main/java/com/micesign/repository/UserRepository.java
decisions:
  - "API key injected via env var BUDGET_API_KEY with mock default for dev"
  - "RestClient used instead of RestTemplate (modern Spring 6 approach)"
  - "BudgetDataMapper functional interface for template-specific extraction strategy"
  - "OVERTIME totalAmount set to null per Pitfall 4 - budget system calculates cost from hours"
metrics:
  duration: "3m 30s"
  completed: "2026-04-07T02:20:18Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 14
  files_modified: 4
---

# Phase 17 Plan 01: Budget Integration Foundation Summary

Budget integration infrastructure with Flyway migration, Spring Retry configuration, RestClient bean, BudgetApiClient interface with Mock/Real implementations (@Retryable with 3 attempts), and BudgetDataExtractor using strategy pattern for 4 financial template codes.

## Task Results

### Task 1: Gradle dependencies, Flyway V12 migration, configuration, entity updates
- **Commit:** e691c97
- **Result:** Added spring-retry + AOP dependencies, created V12 migration (budget_enabled column + budget_integration_log table), configured budget API section in application.yml, added budgetEnabled to ApprovalTemplate, created BudgetIntegrationLog entity, RetryConfig, BudgetApiConfig with RestClient bean

### Task 2: Event POJOs, DTOs, BudgetApiClient interface + implementations, BudgetDataExtractor
- **Commit:** def3302
- **Result:** Created BudgetIntegrationEvent and BudgetCancellationEvent POJOs, BudgetExpenseRequest/BudgetCancellationRequest/BudgetApiResponse DTOs, BudgetApiClient interface, MockBudgetApiClient (@Profile !prod), RealBudgetApiClient (@Profile prod with @Retryable), BudgetDataExtractor with mappers for EXPENSE, PURCHASE, BUSINESS_TRIP, OVERTIME

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `./gradlew compileJava` BUILD SUCCESSFUL after both tasks
- All 14 new files created and verified
- All 4 modified files updated correctly
- @EnableRetry present in RetryConfig
- @Retryable annotations on RealBudgetApiClient methods
- @Profile("!prod") on MockBudgetApiClient, @Profile("prod") on RealBudgetApiClient
- BudgetDataExtractor handles all 4 template codes with correct JSON key mapping
- OVERTIME extractOvertime sets totalAmount to null (Pitfall 4)

## Known Stubs

None - all components are fully implemented with real logic.

## Threat Flags

None - no new security surface beyond what is documented in the plan's threat model.
