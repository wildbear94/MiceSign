---
phase: 17-budget-integration
verified: 2026-04-07T03:00:00Z
status: gaps_found
score: 1/2 must-haves verified
overrides_applied: 0
gaps:
  - truth: "재무 문서가 제출되면 예산 시스템에 지출 데이터를 자동으로 전송한다"
    status: failed
    reason: "BudgetIntegrationService는 완전히 구현되어 있으나, DocumentService.submitDocument()가 BudgetIntegrationEvent를 발행하지 않아 이벤트 리스너가 실제로 호출되지 않는다. 이벤트 퍼블리싱이 코드베이스 어디에도 존재하지 않는다."
    artifacts:
      - path: "backend/src/main/java/com/micesign/service/DocumentService.java"
        issue: "submitDocument()가 ApprovalNotificationEvent만 발행하고 BudgetIntegrationEvent는 발행하지 않음 (line 219)"
      - path: "backend/src/main/java/com/micesign/budget/BudgetIntegrationService.java"
        issue: "핸들러(@TransactionalEventListener)는 완전히 구현되어 있으나 발행되는 이벤트가 없어 절대 호출되지 않음"
    missing:
      - "DocumentService.submitDocument()에서 BudgetIntegrationEvent 발행 추가"
      - "DocumentService.withdrawDocument() 또는 ApprovalService.reject()에서 BudgetCancellationEvent 발행 추가 (취소 플로우)"
  - truth: "API 호출 실패 시 재시도(최대 설정 횟수)되고 모든 시도가 로깅되며, 문서 제출 워크플로를 차단하지 않는다"
    status: partial
    reason: "재시도 인프라(@Retryable, @Recover, BudgetIntegrationLog)는 정상 구현되어 있다. 그러나 이벤트 퍼블리싱이 없어 재시도 경로가 실제로 실행되지 않는다. 또한 CR-02가 지적한 @Recover 라벨 미지정 문제가 있어 prod 환경에서 recover 메서드 매칭이 불확실하다."
    artifacts:
      - path: "backend/src/main/java/com/micesign/budget/RealBudgetApiClient.java"
        issue: "@Retryable에 label 속성 미지정으로 @Recover 메서드 2개가 ambiguous 매칭 상태 (CR-02)"
    missing:
      - "RealBudgetApiClient의 @Retryable 어노테이션에 label 속성 추가로 @Recover 명시적 바인딩"
      - "(상위 gap 해결 후) 이벤트가 실제 발행되어야 재시도 경로 검증 가능"
---

# Phase 17: Budget Integration 검증 보고서

**Phase 목표:** 재무 결재 문서가 제출될 때 승인 워크플로를 차단하지 않고 외부 예산 시스템에 지출 데이터를 자동으로 전송한다
**검증 일시:** 2026-04-07T03:00:00Z
**상태:** gaps_found
**재검증 여부:** 아니오 (최초 검증)

---

## 핵심 발견: 이벤트 퍼블리싱 누락

Phase 17의 가장 중대한 문제는 **이벤트 연결 고리의 완전한 부재**이다.

- `BudgetIntegrationService`의 `handleBudgetEvent()` — 완전히 구현됨 (@TransactionalEventListener + @Async)
- `BudgetIntegrationEvent` 클래스 — 정의됨
- 그러나 **어떤 코드도 이 이벤트를 발행하지 않는다**

`DocumentService.submitDocument()` (line 219)는 오직 `ApprovalNotificationEvent`만 발행한다. `BudgetIntegrationEvent` 발행이 없다. 결과적으로 재무 문서가 제출되어도 예산 시스템 연동이 전혀 발생하지 않는다.

이 사실은 17-02-SUMMARY.md에도 명시적으로 문서화되어 있다 ("Known Stubs" 섹션의 "Event publishing not wired"). 그러나 이것은 단순한 스텁이 아니라 **Phase 목표를 무효화하는 핵심 gap**이다.

---

## 목표 달성 여부

### Observable Truths

| # | Truth | 상태 | 근거 |
|---|-------|------|------|
| 1 | 재무 문서(지출 결의, 구매 요청) 제출 시 예산 시스템에 REST API로 지출 데이터를 전송한다 | ✗ FAILED | DocumentService.submitDocument()가 BudgetIntegrationEvent를 발행하지 않음. BudgetIntegrationService 핸들러가 절대 호출되지 않는다. |
| 2 | API 호출 실패 시 설정된 횟수만큼 재시도하고 모든 시도를 로깅하며 문서 제출을 차단하지 않는다 | ~ PARTIAL | 재시도 인프라(@Retryable 3회, @Recover, BudgetIntegrationLog 저장)는 올바르게 구현됨. 그러나 이벤트가 발행되지 않아 실행 불가. @Recover 라벨 미지정 문제(CR-02)도 존재. |

**점수: 1/2 truths 검증됨** (부분 통과 1개를 포함해도 0.5/2가 실질적 현황)

---

## 아티팩트 검증

### Plan 01 생성 파일

| 아티팩트 | 존재 여부 | 실체 | 연결 상태 |
|---------|---------|------|---------|
| `V12__add_budget_integration.sql` | ✓ | budget_enabled 컬럼 + budget_integration_log 테이블 완전 정의 | ✓ |
| `BudgetIntegrationLog.java` | ✓ | JPA 엔티티 완전 구현 | ✓ |
| `BudgetIntegrationLogRepository.java` | ✓ | 존재 | ✓ |
| `RetryConfig.java` | ✓ | @EnableRetry 활성화 | ✓ |
| `BudgetApiConfig.java` | ✓ | RestClient 빈 생성 | ✓ |
| `BudgetIntegrationEvent.java` | ✓ | POJO 정의됨 | ✗ ORPHANED — 어디서도 발행되지 않음 |
| `BudgetCancellationEvent.java` | ✓ | POJO 정의됨 | ✗ ORPHANED — 어디서도 발행되지 않음 |
| `BudgetApiClient.java` (interface) | ✓ | 인터페이스 정의됨 | ✓ |
| `MockBudgetApiClient.java` | ✓ | @Profile("!prod") 구현 | ✓ |
| `RealBudgetApiClient.java` | ✓ | @Profile("prod") + @Retryable 구현 | ✓ (prod 전용) |
| `BudgetDataExtractor.java` | ✓ | 4개 템플릿 코드 전략 패턴 구현 | ✓ |

### Plan 02 생성 파일

| 아티팩트 | 존재 여부 | 실체 | 연결 상태 |
|---------|---------|------|---------|
| `BudgetIntegrationService.java` | ✓ | @TransactionalEventListener + @Async 완전 구현 | ✗ HOLLOW — 핸들러 존재하나 이벤트가 발행되지 않아 미호출 |
| `EmailService.java` | ✓ | 로깅 스텁 (SMTP Phase 1-B 미구현) | ~ STUB (의도적, SMTP 지연 결정) |
| `budget-failure-notification.html` | ✓ | Thymeleaf 템플릿 | ✓ |
| `BudgetDataExtractorTest.java` | ✓ | 5개 테스트 | ✓ |
| `BudgetIntegrationServiceTest.java` | ✓ | 8개 테스트 | ✓ |
| `BudgetRetryIntegrationTest.java` | ✓ | 4개 테스트 | ✓ |

### 핵심 연결 고리(Key Links) 검증

| From | To | Via | 상태 | 세부 사항 |
|------|----|-----|------|---------|
| `DocumentService.submitDocument()` | `BudgetIntegrationService.handleBudgetEvent()` | `BudgetIntegrationEvent` 발행 | ✗ NOT_WIRED | publishEvent(BudgetIntegrationEvent) 코드 없음 |
| `DocumentService.withdrawDocument()` | `BudgetIntegrationService.handleCancellationEvent()` | `BudgetCancellationEvent` 발행 | ✗ NOT_WIRED | publishEvent(BudgetCancellationEvent) 코드 없음 |
| `BudgetIntegrationService` | `BudgetApiClient` | `sendExpenseData()` 호출 | ✓ WIRED | 서비스 내에서 직접 호출 (단, 서비스 자체가 호출되지 않음) |
| `RealBudgetApiClient` | `@Recover` 메서드 | Spring Retry 프록시 | ~ PARTIAL | @Recover는 존재하나 label 미지정으로 복수 recover 메서드 매칭 불확실 |
| `BudgetIntegrationService` | `BudgetIntegrationLog` | 로그 저장 | ✓ WIRED | logRepository.save() 호출 확인 |

---

## 요구사항 커버리지

REQUIREMENTS.md에 **BDGT-01, BDGT-02가 존재하지 않는다**. 이 요구사항 IDs는 ROADMAP.md Phase 17에만 명시되어 있고, REQUIREMENTS.md의 v1/v2 요구사항 목록과 Traceability 표에 포함되어 있지 않다.

| 요구사항 | REQUIREMENTS.md 존재 | ROADMAP 정의 | 상태 |
|---------|-------------------|-------------|------|
| BDGT-01 | ✗ 없음 | ✓ Phase 17 Requirements에 명시 | ORPHANED in REQUIREMENTS.md — 추적 불가 |
| BDGT-02 | ✗ 없음 | ✓ Phase 17 Requirements에 명시 | ORPHANED in REQUIREMENTS.md — 추적 불가 |

REQUIREMENTS.md 업데이트가 필요하다. BDGT-01/BDGT-02를 추가하고 Traceability 표에 Phase 17 매핑을 등록해야 한다.

---

## 안티패턴 탐지

### Flyway 버전 충돌 위험

`V12__add_budget_integration.sql`이 생성되었으나, Phase 16 SUMMARY에는 `V12__seed_dynamic_template.sql`도 언급된다. 현재 마이그레이션 폴더에 두 파일 모두 존재한다:

- `V11__seed_dynamic_template.sql`
- `V12__add_budget_integration.sql`

실제로는 Phase 16 파일이 V11로 넘버링되고 Phase 17 파일이 V12로 생성된 것으로 보인다. 파일 목록 확인 결과 중복 버전은 없다. 단, SUMMARY.md가 "V12"라고 언급하면서 혼란을 줄 수 있다 (실제로는 Phase 16 파일이 V11이다).

### 식별된 코드 스멜

| 파일 | 라인 | 패턴 | 심각도 | 영향 |
|------|------|------|--------|------|
| `BudgetDataExtractor.java` | 57-61 | JSON 파싱 실패 시 잘못된 데이터(totalAmount=0, details={"error":...}) 반환 후 API 전송 | ⚠️ Warning | 예산 시스템에 오염된 데이터 전송 가능 (WR-02) |
| `RealBudgetApiClient.java` | 32-35, 55-58 | @Retryable에 label 미지정으로 두 @Recover 메서드 매칭 불확실 | ⚠️ Warning | Prod 환경에서 잘못된 recover 메서드 호출 가능 (CR-02) |
| `BudgetIntegrationService.java` | 118 | 성공 시 attemptCount=1 하드코딩 (실제 retry 횟수 미반영) | ℹ️ Info | 감사 로그의 attempt_count 정확도 저하 (WR-01) |
| `application.yml` | - | DB 비밀번호/JWT 시크릿 기본값으로 실제 값 하드코딩 | 🛑 Blocker (보안) | Git 저장소에 자격증명 노출 (CR-01) — Phase 17 외 문제이나 긴급 수정 필요 |
| `EmailService.java` | - | 로깅만 하는 스텁 | ℹ️ Info | 의도적 지연 (Phase 1-B 예정). 실패 알림이 실제 전송되지 않음. |

---

## 행동 스팟 체크 (Step 7b)

재무 문서 제출 시 이벤트 발행이 없어 실제 실행 경로를 검증할 수 없다.

| 동작 | 명령 | 결과 | 상태 |
|------|------|------|------|
| budget 테스트 17개 통과 | `./gradlew test --tests "com.micesign.budget.*"` | SUMMARY: 17 tests, 0 failures | ? SKIP (실행 환경 없음, SUMMARY 신뢰) |
| 이벤트 발행 확인 | grep BudgetIntegrationEvent publish | 발행 코드 없음 | ✗ FAIL |
| BudgetIntegrationService 핸들러 연결 | grep @TransactionalEventListener | 핸들러 존재 확인 | ✓ PASS (핸들러 존재) |
| Flyway V12 마이그레이션 존재 | ls migration/ | V12__add_budget_integration.sql 확인 | ✓ PASS |

---

## 인간 검증 필요 항목

해당 없음 (핵심 gap이 프로그래밍적으로 확인됨).

---

## Gap 요약

**Phase 17은 목표를 달성하지 못했다.** 핵심 이유는 단 하나다:

**이벤트 퍼블리싱 누락.** `BudgetIntegrationService`는 이벤트를 기다리는 완전한 핸들러를 갖추고 있다. 그러나 `DocumentService.submitDocument()`가 `BudgetIntegrationEvent`를 발행하지 않아 이 핸들러는 실제로 절대 호출되지 않는다. 결과적으로 어떤 재무 문서를 제출해도 예산 시스템으로 데이터가 전송되지 않는다.

이 gap은 17-02-SUMMARY.md의 "Known Stubs" 섹션에 명시적으로 문서화되어 있다 — 실행자는 이 문제를 인지하고 있었으나, `submitDocument()`/`withdrawDocument()`가 당시 존재하지 않는다고 판단해 건너뛰었다. 그러나 검증 결과 두 메서드 모두 이미 `DocumentService`에 구현되어 있다. 이벤트 발행 추가는 즉시 실행 가능하다.

**수정 범위:** `DocumentService.submitDocument()` 에 2줄 추가 (BudgetIntegrationEvent 생성 및 발행)로 Gap 1이 해결된다. Gap 2의 @Recover label 문제는 RealBudgetApiClient 수정으로 해결 가능하다.

**REQUIREMENTS.md 업데이트 필요:** BDGT-01, BDGT-02가 REQUIREMENTS.md에 없다. Phase 17 완료 전 추가 필요.

---

_검증 일시: 2026-04-07_
_검증자: Claude (gsd-verifier)_
