# Phase 17: Budget Integration - Context

**Gathered:** 2026-04-07 (updated from 2026-04-06)
**Status:** Ready for planning

<domain>
## Phase Boundary

Financial approval documents automatically send expense data to the external budget system upon submission, without blocking the approval workflow. Covers REST API integration, async triggering, retry logic, failure logging, and cancellation on rejection/withdrawal.

</domain>

<decisions>
## Implementation Decisions

### External API Design
- **D-01:** 실제 외부 예산 시스템이 존재하나 API 스펙은 미확정 — 일반적인 REST 패턴(POST /api/budget/expenses)으로 인터페이스 설계하고, 나중에 실제 스펙에 맞춰 조정
- **D-02:** HTTP 클라이언트로 Spring Boot 3.x 내장 RestClient 사용 — 별도 의존성 불필요, 동기 방식의 간결한 API
- **D-03:** 외부 API 설정(base URL, timeout, 인증 정보)은 application.yml에서 관리하여 환경별 설정 가능하게 구성
- **D-04:** RestClient timeout 설정: connectTimeout=3초, readTimeout=5초

### Mock/Real Switching
- **D-05:** BudgetApiClient를 인터페이스로 정의. MockBudgetApiClient(@Profile("!prod"))와 RealBudgetApiClient(@Profile("prod"))를 각각 구현. spring.profiles.active로 전환

### Trigger Mechanism
- **D-06:** @TransactionalEventListener(phase=AFTER_COMMIT)를 활용한 비동기 이벤트 방식으로 예산 API 호출 — 문서 제출 트랜잭션과 완전 분리
- **D-07:** 호출 시점은 문서 제출 시(DRAFT → SUBMITTED 상태 변경) — 예산 "예약" 개념
- **D-08:** AOP 레이어 분리: @Async는 BudgetIntegrationService.handleBudgetEvent()에만, @Retryable은 BudgetApiClient.sendExpenseData()에만 적용. self-invocation 문제 없이 동작
- **D-09:** handleBudgetEvent()에서 전체 로직을 try-catch로 감싸서 예외가 @Async 스레드에서 유실되지 않도록 함. catch 블록에서 FAILED 로그 기록 + 관리자 알림

### Cancellation on Rejection/Withdrawal
- **D-10:** 문서가 REJECTED 또는 WITHDRAWN되면 BudgetCancellationEvent를 발행하여 예산 시스템에 취소 요청 전송
- **D-11:** ApprovalService.reject()와 DocumentService.withdrawDocument() 둘 다에서 취소 이벤트 발행
- **D-12:** 취소도 동일한 비동기 + 재시도 패턴 적용

### Target Template Identification
- **D-13:** 예산 연동 대상 양식: EXPENSE(지출 결의서), PURCHASE(구매 요청서), BUSINESS_TRIP(출장 보고서), OVERTIME(연장 근무 신청서) — 4개 양식
- **D-14:** ApprovalTemplate 엔티티에 `budget_enabled` boolean 컬럼 추가로 동적 식별 — 하드코딩이 아닌 DB 플래그 기반
- **D-15:** Flyway V12 마이그레이션으로 기존 4개 템플릿의 budget_enabled = true 설정
- **D-16:** 새 템플릿의 budget_enabled 기본값은 false — 관리자가 명시적으로 활성화

### Data Extraction Strategy
- **D-17:** templateCode별 고정 키 매핑 사용. BudgetDataExtractor가 Map<String, BudgetDataMapper>로 각 templateCode별 JSON 키 경로를 매핑
  - EXPENSE: items/totalAmount
  - PURCHASE: items/totalAmount/supplier/deliveryDate
  - BUSINESS_TRIP: expenses/totalExpense + 출장지/기간
  - OVERTIME: hours/hourlyRate

### Budget API Request DTO
- **D-18:** 공통 필드 + 템플릿별 details 확장 구조
  - 공통: documentNumber, templateCode, drafterEmployeeNo, drafterName, departmentName, submittedAt, totalAmount
  - 템플릿별: details 객체에 items[], supplier, expenses[] 등 추가 필드

### Failure Handling Strategy
- **D-19:** spring-retry 라이브러리 사용 — @Retryable(maxAttempts=3, backoff=2초) 어노테이션으로 선언적 재시도
- **D-20:** 모든 재시도 실패 시 FAILED 로그 기록 + SUPER_ADMIN 전체에게 SMTP 알림 메일 발송 (기존 EmailService 재사용)
- **D-21:** 문서 제출 자체는 예산 API 성공/실패와 무관하게 정상 진행

### Logging
- **D-22:** budget_integration_log 전용 테이블 사용 (AuditLog와 분리)
- **D-23:** 요청 payload(JSON) + 응답 payload(JSON) 모두 저장 — 디버깅과 감사에 유용
- **D-24:** 최종 결과만 1건 INSERT, attempt_count에 실제 시도 횟수 기록
- **D-25:** 로그 무기한 보존 — 50명 규모에서 데이터량 미미

### Database Migration
- **D-26:** Flyway V12__add_budget_integration.sql 사용 (현재 V11까지 존재, V12 비어있음)
- **D-27:** budget_enabled 컬럼(ApprovalTemplate) + budget_integration_log 테이블 생성

### Testing Strategy
- **D-28:** Unit + Integration 테스트 모두 작성
  - Unit: BudgetDataExtractor (4개 템플릿 매핑 + 알 수 없는 코드), BudgetIntegrationService (skip/success/fail/reject/withdraw)
  - Integration: @Retryable 동작, E2E 흐름 (제출→이벤트→로그), 마이그레이션

### Claude's Discretion
- 재시도 backoff 정확한 설정값 (2초 기반)
- BudgetIntegrationService 내부 메서드 구조
- 알림 메일 Thymeleaf 템플릿 디자인
- budget_integration_log 인덱스 설계

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Architecture
- `docs/PRD_MiceSign_v2.0.md` — 전체 제품 요구사항, DB 스키마 DDL, 기술 아키텍처
- `docs/FSD_MiceSign_v1.0.md` — API 계약, 비즈니스 규칙, 에러 코드 명세

### Design Document
- `~/.gstack/projects/wildbear94-MiceSign/parksang-yeong-master-design-20260407-101743.md` — Phase 17 디자인 문서 (APPROVED), 데이터 흐름도, 테이블 설계, AOP 분리 전략

### Existing Code (Integration Points)
- `backend/src/main/java/com/micesign/service/DocumentService.java` — 문서 CRUD 서비스, submitDocument() line 187-224에서 이벤트 발행 추가
- `backend/src/main/java/com/micesign/service/ApprovalService.java` — reject() line 116-164에서 취소 이벤트 발행 추가
- `backend/src/main/java/com/micesign/domain/ApprovalTemplate.java` — 템플릿 엔티티, budget_enabled 컬럼 추가 대상
- `backend/src/main/java/com/micesign/service/NotificationService.java` — @TransactionalEventListener + @Async 패턴 참고
- `backend/src/main/java/com/micesign/event/ApprovalNotificationEvent.java` — 이벤트 POJO 패턴 참고
- `backend/src/main/java/com/micesign/config/AsyncConfig.java` — 비동기 스레드 풀 설정 (core=2, max=5)
- `backend/src/main/java/com/micesign/service/EmailService.java` — 관리자 알림 메일 발송에 재사용
- `backend/src/main/java/com/micesign/service/DocumentFormValidator.java` — formData JSON 구조 참고
- `backend/src/main/java/com/micesign/domain/DocumentContent.java` — formData 필드, schemaDefinitionSnapshot

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ApplicationEventPublisher**: DocumentService에 이미 주입됨 (line 57, constructor line 71-85)
- **@TransactionalEventListener + @Async 패턴**: NotificationService에서 확립됨 — 동일 패턴 복제
- **AsyncConfig**: core=2, max=5 스레드 풀. SimpleAsyncUncaughtExceptionHandler 설정됨
- **EmailService**: SMTP 알림 인프라 (Phase 9에서 구축)
- **ApprovalNotificationEvent**: 이벤트 POJO 패턴 — BudgetIntegrationEvent도 동일 구조
- **DocumentFormValidator**: strategy 패턴으로 templateCode별 유효성 검증 — formData JSON 키 구조 참고

### Established Patterns
- **Spring Boot 3.5.13**: RestClient 내장, spring-retry 의존성 추가만 필요
- **Flyway 마이그레이션**: V11까지 존재, V12 비어있음
- **JPA + @Transactional**: 서비스 레이어 트랜잭션 패턴 확립
- **LazyInitializationException 방지**: @Async 스레드에서 엔티티를 document ID로 재조회하는 패턴 (NotificationService line 59-60)

### Integration Points
- **DocumentService.submitDocument()**: line 219에서 기존 ApprovalNotificationEvent 발행 직후에 BudgetIntegrationEvent 발행 추가
- **ApprovalService.reject()**: line 162에서 기존 이벤트 발행 직후에 BudgetCancellationEvent 발행 추가
- **DocumentService.withdrawDocument()**: 인출 시 BudgetCancellationEvent 발행 추가
- **build.gradle.kts**: spring-retry 의존성 추가
- **application.yml**: budget API 설정 (base-url, timeout, retry config) 추가

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- 관리자 수동 재시도 UI/엔드포인트 (FAILED 건 재처리) — scope 외
- Circuit breaker 패턴 — 50명 규모에서 과잉
- 동적 템플릿의 budget 필드 자동 감지 — 현재 하드코딩 4개만 대상
- 스키마 버전별 매핑 전략 — 하드코딩 템플릿 필드명 고정
- 예산 시스템 대시보드/통계 — Phase 17 scope 외

</deferred>

---

*Phase: 17-budget-integration*
*Context updated: 2026-04-07 (engineering review findings incorporated)*
