# Phase 17: Budget Integration - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Financial approval documents automatically send expense data to the external budget system upon submission, without blocking the approval workflow. Covers REST API integration, async triggering, retry logic, and failure logging.

</domain>

<decisions>
## Implementation Decisions

### External API Design
- **D-01:** 실제 외부 예산 시스템이 존재하나 API 스펙은 미확정 — 일반적인 REST 패턴(POST /api/budget/expenses)으로 인터페이스 설계하고, 나중에 실제 스펙에 맞춰 조정
- **D-02:** HTTP 클라이언트로 Spring Boot 3.x 내장 RestClient 사용 — 별도 의존성 불필요, 동기 방식의 간결한 API
- **D-03:** 외부 API 설정(base URL, timeout, 인증 정보)은 application.yml에서 관리하여 환경별 설정 가능하게 구성

### Trigger Mechanism
- **D-04:** @TransactionalEventListener를 활용한 비동기 이벤트 방식으로 예산 API 호출 — 문서 제출 트랜잭션과 완전 분리
- **D-05:** 호출 시점은 문서 제출 시(DRAFT → SUBMITTED 상태 변경) — 최종 승인이 아닌 제출 시점에 예산 데이터 전송

### Target Template Identification
- **D-06:** 예산 연동 대상 양식: EXPENSE(지출 결의서), PURCHASE(구매 요청서), BUSINESS_TRIP(출장 보고서), OVERTIME(연장 근무 신청서) — 4개 양식
- **D-07:** ApprovalTemplate 엔티티에 `budget_enabled` boolean 컬럼 추가로 동적 식별 — 하드코딩이 아닌 DB 플래그 기반
- **D-08:** Flyway 마이그레이션으로 기존 4개 템플릿의 budget_enabled = true 설정

### Failure Handling Strategy
- **D-09:** spring-retry 라이브러리 사용 — @Retryable 어노테이션으로 선언적 재시도 구현 (maxAttempts, backoff 설정)
- **D-10:** 모든 재시도 실패 시 로그 기록 + 관리자 알림 — 문서 제출 자체는 정상 진행
- **D-11:** 예산 API 호출 결과(성공/실패/재시도 횟수)를 전용 로그 테이블 또는 AuditLog에 기록

### Claude's Discretion
- 재시도 횟수(maxAttempts)와 backoff 간격 설정값
- 예산 API 요청/응답 DTO 필드 구조
- 관리자 알림 방식 (기존 SMTP 알림 인프라 활용 vs 대시보드 표시)
- BudgetIntegrationService 내부 구조와 에러 핸들링 상세

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Architecture
- `docs/PRD_MiceSign_v2.0.md` — 전체 제품 요구사항, DB 스키마 DDL, 기술 아키텍처
- `docs/FSD_MiceSign_v1.0.md` — API 계약, 비즈니스 규칙, 에러 코드 명세

### Existing Code (Integration Points)
- `backend/src/main/java/com/micesign/service/DocumentService.java` — 문서 CRUD 서비스, 제출 로직 확장 지점
- `backend/src/main/java/com/micesign/domain/ApprovalTemplate.java` — 템플릿 엔티티, budget_enabled 컬럼 추가 대상
- `backend/src/main/java/com/micesign/domain/enums/DocumentStatus.java` — DRAFT→SUBMITTED 상태 전이
- `backend/src/main/java/com/micesign/domain/AuditLog.java` — 기존 감사 로그 도메인
- `backend/src/main/java/com/micesign/service/DocumentFormValidator.java` — 양식 유효성 검증, formData 구조 참고

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AuditLog 도메인/리포지토리**: 기존 감사 로그 인프라를 예산 API 호출 로그에 활용 가능
- **DocumentFormValidator**: 양식별 formData JSON 구조를 이해하고 있어, 예산 데이터 추출 매핑에 참고
- **ApprovalTemplate 엔티티**: code 필드로 양식 식별, budget_enabled 컬럼 추가만으로 확장 가능

### Established Patterns
- **Spring Boot 3.5.13**: RestClient 내장, spring-retry 의존성 추가만 필요
- **Flyway 마이그레이션**: 스키마 변경은 Flyway 파일로 관리 (현재 V11까지 존재)
- **JPA + @Transactional**: 서비스 레이어 트랜잭션 패턴 확립

### Integration Points
- **DocumentService**: 제출 메서드에서 이벤트 발행 추가 필요 (ApplicationEventPublisher)
- **build.gradle.kts**: spring-retry 의존성 추가
- **application.yml**: 외부 예산 API 설정 (base-url, timeout, retry config)
- **SecurityConfig**: 예산 API 관련 내부 엔드포인트 접근 제어 (해당 시)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-budget-integration*
*Context gathered: 2026-04-06*
