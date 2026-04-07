# Phase 17: Budget Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06 (initial), 2026-04-07 (updated with eng review)
**Phase:** 17-budget-integration
**Areas discussed:** External API Design, Trigger Mechanism, Target Template Identification, Failure Handling Strategy, Admin Notification, DTO Fields, Log Table Design, Flyway Version, Testing Strategy, budget_enabled Default

---

## External API Design

| Option | Description | Selected |
|--------|-------------|----------|
| 실제 시스템 존재 | 연동할 외부 예산 시스템이 있으며, API 스펙이 정해져 있음 | ✓ (시스템 존재) |
| Mock API로 시작 | 아직 외부 시스템 미확정. 인터페이스만 설계하고 나중에 실제 연동 | |
| 예산 연동 자체가 미래 계획 | 지금은 인프라만 만들고, 실제 연동은 나중에 결정 | |

**User's choice:** 실제 시스템 존재, API 스펙은 미확정
**Notes:** 일반적인 REST 패턴으로 인터페이스 설계

| Option | Description | Selected |
|--------|-------------|----------|
| RestClient (추천) | Spring Boot 3.x 내장, 별도 의존성 불필요 | ✓ |
| WebClient | Spring WebFlux 의존성 필요, 비동기 지원 | |

**User's choice:** RestClient

---

## Trigger Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| 비동기 이벤트 (추천) | @TransactionalEventListener로 비동기 처리 | ✓ |
| 동기 호출 (try-catch) | 제출 로직 내에서 직접 호출하되 예외를 catch | |

**User's choice:** 비동기 이벤트

| Option | Description | Selected |
|--------|-------------|----------|
| 문서 제출 시 (추천) | DRAFT → SUBMITTED 상태 변경 시점에 이벤트 발생 | ✓ |
| 최종 승인 시 | SUBMITTED → APPROVED 상태 변경 시점에 이벤트 발생 | |
| 제출 + 승인 둘 다 | 제출 시 예산 예약, 승인 시 예산 확정 (두 번 호출) | |

**User's choice:** 문서 제출 시

---

## Target Template Identification

| Option | Description | Selected |
|--------|-------------|----------|
| 지출 결의서 (EXPENSE) | 지출 항목, 금액, 증빙 등 재무 데이터 포함 | ✓ |
| 구매 요청서 (PURCHASE) | 구매 항목, 수량, 단가, 금액 등 재무 데이터 포함 | ✓ |
| 출장 보고서 (BUSINESS_TRIP) | 출장 경비 항목이 있을 수 있음 | ✓ |
| 연장 근무 (OVERTIME) | 연장 근무 수당 등 재무 영향 가능 | ✓ |

**User's choice:** 4개 양식 모두

| Option | Description | Selected |
|--------|-------------|----------|
| 템플릿에 플래그 추가 | ApprovalTemplate에 budget_enabled 컬럼 추가 | ✓ |
| 템플릿 코드 하드코딩 | 코드에 직접 리스트로 정의 | |

**User's choice:** 템플릿에 플래그 추가

---

## Failure Handling Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| spring-retry 사용 (추천) | @Retryable 어노테이션으로 선언적 구현 | ✓ |
| 직접 구현 | for 루프 + try-catch로 직접 retry 로직 구현 | |

**User's choice:** spring-retry 사용

---

## Admin Notification (2026-04-07 추가)

| Option | Description | Selected |
|--------|-------------|----------|
| SMTP 이메일 (추천) | 기존 EmailService 재사용, SUPER_ADMIN에게 실패 알림 메일 발송 | ✓ |
| 대시보드 표시만 | budget_integration_log를 조회하는 관리자 페이지에서 확인 | |

**User's choice:** SMTP 이메일

| Option | Description | Selected |
|--------|-------------|----------|
| SUPER_ADMIN 전체 (추천) | SUPER_ADMIN 역할을 가진 모든 사용자에게 발송 | ✓ |
| 문서 작성자 | 예산 연동 실패한 문서의 작성자에게 발송 | |

**User's choice:** SUPER_ADMIN 전체

---

## Budget API Request DTO (2026-04-07 추가)

| Option | Description | Selected |
|--------|-------------|----------|
| 전체 필드 (추천) | 문서번호 + 템플릿 + 작성자정보 + 제출일 + 총액 + 항목리스트 | ✓ |
| 최소한만 | 문서번호 + 템플릿 + 총액만 전송 | |

**User's choice:** 전체 필드

| Option | Description | Selected |
|--------|-------------|----------|
| 공통 DTO + 템플릿별 확장 (추천) | 공통 필드(문서번호, 작성자, 총액) + 템플릿별 details 객체 | ✓ |
| 통일 DTO | 모든 템플릿이 동일한 구조로 전송 (일부 필드 null 허용) | |

**User's choice:** 공통 DTO + 템플릿별 확장

---

## Log Table Design (2026-04-07 추가)

| Option | Description | Selected |
|--------|-------------|----------|
| 요청+응답 모두 저장 (추천) | request_payload(JSON) + response_payload(JSON) 컬럼에 저장 | ✓ |
| 에러 메시지만 | 실패 시 error_message만 저장, payload는 미저장 | |

**User's choice:** 요청+응답 모두 저장

| Option | Description | Selected |
|--------|-------------|----------|
| 무기한 보존 (추천) | 50명 규모에서 데이터량 미미, 감사 목적으로 전체 보존 | ✓ |
| 90일 보존 | 90일 이상 된 기록은 자동 삭제 | |

**User's choice:** 무기한 보존

---

## Flyway Version (2026-04-07 추가)

| Option | Description | Selected |
|--------|-------------|----------|
| V12 사용 (추천) | V12__add_budget_integration.sql — 순차적 번호 유지 | ✓ |
| V13 사용 | 디자인 문서 원안대로 V13 | |

**User's choice:** V12 사용

---

## Testing Strategy (2026-04-07 추가)

| Option | Description | Selected |
|--------|-------------|----------|
| Unit + Integration (추천) | BudgetDataExtractor unit + BudgetIntegrationService mock + E2E 흐름 테스트 | ✓ |
| Unit만 | 단위 테스트만 작성, 통합 테스트는 생략 | |

**User's choice:** Unit + Integration

---

## budget_enabled Default (2026-04-07 추가)

| Option | Description | Selected |
|--------|-------------|----------|
| false (추천) | 새 템플릿은 기본적으로 예산 연동 비활성화. 관리자가 명시적으로 활성화 | ✓ |
| true | 모든 새 템플릿이 자동으로 예산 연동 활성화 | |

**User's choice:** false

---

## Engineering Review Decisions (2026-04-07)

엔지니어링 리뷰(/plan-eng-review)에서 추가된 결정사항:

- **AOP 레이어 분리:** @Async는 BudgetIntegrationService, @Retryable은 BudgetApiClient에만 적용
- **Mock/Real 전환:** @Profile("!prod") / @Profile("prod")로 구현체 분리
- **formData 추출:** templateCode별 고정 키 매핑 (BudgetDataExtractor)
- **반려/인출 취소:** REJECTED + WITHDRAWN 모두 BudgetCancellationEvent 발행
- **try-catch:** handleBudgetEvent()에서 전체 로직을 try-catch로 감싸서 예외 유실 방지
- **Timeout:** RestClient connectTimeout=3초, readTimeout=5초
- **스레드 풀:** 기존 AsyncConfig(core=2, max=5) 공유

## Claude's Discretion

- 재시도 backoff 정확한 설정값 (2초 기반)
- BudgetIntegrationService 내부 메서드 구조
- 알림 메일 Thymeleaf 템플릿 디자인
- budget_integration_log 인덱스 설계

## Deferred Ideas

- 관리자 수동 재시도 UI/엔드포인트
- Circuit breaker 패턴
- 동적 템플릿 budget 필드 자동 감지
- 스키마 버전별 매핑 전략
- 예산 시스템 대시보드/통계
