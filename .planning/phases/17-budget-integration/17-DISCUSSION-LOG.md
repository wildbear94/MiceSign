# Phase 17: Budget Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 17-budget-integration
**Areas discussed:** External API Design, Trigger Mechanism, Target Template Identification, Failure Handling Strategy

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
| API 스펙 확정 | 엔드포인트, 필드, 인증 방식 등이 정해져 있음 | |
| API 스펙 미확정 | 연동할 시스템은 있지만 API 스펙은 아직 미확정 | ✓ |
| Claude가 결정 | 일반적인 예산 시스템 API 패턴으로 설계 | |

**User's choice:** API 스펙 미확정

| Option | Description | Selected |
|--------|-------------|----------|
| RestClient (추천) | Spring Boot 3.x 내장, 별도 의존성 불필요 | ✓ |
| WebClient | Spring WebFlux 의존성 필요, 비동기 지원 | |
| Claude가 결정 | 프로젝트 스택에 맞는 최적의 선택 | |

**User's choice:** RestClient

---

## Trigger Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| 비동기 이벤트 (추천) | @TransactionalEventListener로 비동기 처리 | ✓ |
| 동기 호출 (try-catch) | 제출 로직 내에서 직접 호출하되 예외를 catch | |
| Claude가 결정 | 요구사항에 맞는 최적의 패턴 선택 | |

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
| 템플릿 코드 하드코딩 | 코드에 직접 리스트로 정의 | |
| 템플릿에 플래그 추가 | ApprovalTemplate에 budget_enabled 컬럼 추가 | ✓ |
| Claude가 결정 | 유연성과 단순성을 고려하여 최적 방식 선택 | |

**User's choice:** 템플릿에 플래그 추가

---

## Failure Handling Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| spring-retry 사용 (추천) | @Retryable 어노테이션으로 선언적 구현 | ✓ |
| 직접 구현 | for 루프 + try-catch로 직접 retry 로직 구현 | |
| Claude가 결정 | 프로젝트 상황에 맞는 최적 방식 선택 | |

**User's choice:** spring-retry 사용

| Option | Description | Selected |
|--------|-------------|----------|
| 로그만 기록 (추천) | AuditLog/전용 테이블에 실패 기록 | |
| 로그 + 알림 | 실패 기록 + 관리자에게 알림 | ✓ |
| 수동 재시도 UI | 실패 기록 + 관리자가 수동으로 재시도할 수 있는 화면 | |

**User's choice:** 로그 + 알림

---

## Claude's Discretion

- 재시도 횟수(maxAttempts)와 backoff 간격 설정값
- 예산 API 요청/응답 DTO 필드 구조
- 관리자 알림 방식 (기존 SMTP 인프라 활용 vs 대시보드)
- BudgetIntegrationService 내부 구조

## Deferred Ideas

None — discussion stayed within phase scope
