---
phase: 17-budget-integration
reviewed: 2026-04-07T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - backend/src/main/java/com/micesign/budget/BudgetApiClient.java
  - backend/src/main/java/com/micesign/budget/BudgetApiResponse.java
  - backend/src/main/java/com/micesign/budget/BudgetCancellationRequest.java
  - backend/src/main/java/com/micesign/budget/BudgetDataExtractor.java
  - backend/src/main/java/com/micesign/budget/BudgetExpenseRequest.java
  - backend/src/main/java/com/micesign/budget/BudgetIntegrationService.java
  - backend/src/main/java/com/micesign/budget/MockBudgetApiClient.java
  - backend/src/main/java/com/micesign/budget/RealBudgetApiClient.java
  - backend/src/main/java/com/micesign/config/BudgetApiConfig.java
  - backend/src/main/java/com/micesign/config/RetryConfig.java
  - backend/src/main/java/com/micesign/domain/BudgetIntegrationLog.java
  - backend/src/main/java/com/micesign/event/BudgetIntegrationEvent.java
  - backend/src/main/java/com/micesign/event/BudgetCancellationEvent.java
  - backend/src/main/java/com/micesign/repository/BudgetIntegrationLogRepository.java
  - backend/src/main/java/com/micesign/service/EmailService.java
  - backend/src/main/resources/application.yml
  - backend/src/main/resources/db/migration/V12__add_budget_integration.sql
  - backend/src/main/resources/templates/email/budget-failure-notification.html
  - backend/src/test/java/com/micesign/budget/BudgetDataExtractorTest.java
  - backend/src/test/java/com/micesign/budget/BudgetIntegrationServiceTest.java
  - backend/src/test/java/com/micesign/budget/BudgetRetryIntegrationTest.java
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-04-07
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 17 구현은 예산 시스템 연동의 핵심 요구사항(비동기 이벤트 처리, Spring Retry, Mock/Real 클라이언트 분리, 감사 로그)을 전체적으로 올바르게 설계했습니다. 아키텍처 방향은 건전합니다.

그러나 두 가지 Critical 이슈가 있습니다. 하나는 보안 이슈(application.yml에 DB 비밀번호 하드코딩)이고, 하나는 `@Retryable` + `@Async` + `@TransactionalEventListener` 조합에서 발생하는 Spring 프록시 구조 버그로, `@Recover`가 실제로 호출되지 않아 retry 소진 후 예외가 `@Async` 스레드 바깥으로 전파될 수 있습니다. Warning 4건과 Info 3건도 있습니다.

## Critical Issues

### CR-01: DB 비밀번호가 application.yml에 평문으로 하드코딩

**File:** `backend/src/main/resources/application.yml:7`
**Issue:** `DB_PASS` 환경변수가 없을 때의 기본값으로 실제 비밀번호 `wild0235!`가 소스 코드에 노출되어 있습니다. 이 파일이 git에 체크인되면 비밀번호가 저장소 히스토리에 영구 기록됩니다. JWT secret(`micesign-dev-secret-key...`) 역시 같은 문제가 있습니다.
**Fix:**
```yaml
# application.yml - 개발 기본값은 절대 실제 자격증명을 넣지 않는다
datasource:
  password: ${DB_PASS}   # 기본값 제거 — 환경변수 필수화

jwt:
  secret: ${JWT_SECRET}  # 기본값 제거
```
개발 환경은 `.env` 파일(`.gitignore`에 추가) 또는 `application-local.yml`(git 제외)로 분리합니다. `application.yml`에 남겨야 할 개발 기본값은 `localhost`, `3306`, `micesign` 같은 비-비밀 연결 정보에만 한정합니다.

---

### CR-02: `@Retryable`이 `@Async` 컨텍스트에서 동작하지 않아 `@Recover`가 무시됨

**File:** `backend/src/main/java/com/micesign/budget/RealBudgetApiClient.java:32-52`
**Issue:** `@Retryable`은 Spring AOP 프록시를 통해 동작합니다. `BudgetIntegrationService.handleBudgetEvent()`는 `@Async` + `@TransactionalEventListener`로 실행되는데, 이 메서드 안에서 `budgetApiClient.sendExpenseData(request)`를 **직접 인터페이스 호출**합니다. `RealBudgetApiClient`는 별도의 Spring Bean이므로 프록시를 통해 호출되어 retry 자체는 작동합니다. 그러나 문제는 `@Recover` 메서드 매칭 규칙에 있습니다.

Spring Retry는 `@Recover` 메서드를 찾을 때 **동일 클래스 내에서 반환 타입이 일치해야** 하며, 인터페이스(`BudgetApiClient`)가 아닌 구현 클래스(`RealBudgetApiClient`)에 `@Recover`가 선언되어 있어야 합니다. 현재 구조는 이 조건을 만족하므로 프록시 경유 시 `@Recover`는 동작합니다.

실제 버그는 다른 곳에 있습니다. `RealBudgetApiClient`에는 **`sendExpenseData`와 `sendCancellation` 각각에 대해 `@Recover` 메서드가 2개** 있지만, Spring Retry는 recover 메서드를 예외 타입 + 파라미터 타입으로 매칭합니다. `recoverSendExpenseData`와 `recoverSendCancellation`의 시그니처 첫 번째 파라미터가 각각 `BudgetExpenseRequest`와 `BudgetCancellationRequest`로 다르므로 이론상 구분됩니다. 그러나 `@Recover`에 **`@Retryable`과 같은 `retryFor` 타입 제약이 없어** 두 recover 메서드 모두 `RestClientException`에 반응할 수 있고, Spring Retry가 어느 쪽을 선택할지 순서가 보장되지 않습니다.

더 중요한 문제: `BudgetIntegrationService`는 `BudgetApiClient` **인터페이스**를 의존합니다. `@Retryable`은 구현 클래스에 있으므로 인터페이스를 통한 호출 시 Spring AOP가 프록시를 생성하려면 `RealBudgetApiClient`가 CGLIB 대상이 되어야 합니다. `@Component` + `@Profile("prod")`만으로는 충분하지만, **`BudgetApiConfig`에서 `RestClient` 빈만 생성하고 `RealBudgetApiClient` 빈 등록은 `@Component`에 의존**하므로, `@EnableRetry`가 `BudgetApiConfig`와 동일 컨텍스트에 있는지 확인이 필요합니다. `RetryConfig`는 `@Configuration` + `@EnableRetry`로 별도 분리되어 있어 이 부분은 정상입니다.

핵심 버그: `@Recover` 메서드가 2개일 때 **어떤 메서드가 호출될지 명시적으로 지정하는 방법이 없습니다**. Spring Retry 1.3+에서는 recover 메서드를 파라미터 타입으로 매칭하지만, **retry 어노테이션의 `label` 속성을 이용한 명시적 바인딩을 사용하지 않으면 예상치 못한 메서드가 호출될 수 있습니다**.

**Fix:**
```java
// RealBudgetApiClient.java
@Override
@Retryable(
    label = "sendExpenseData",
    retryFor = {RestClientException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 2000, multiplier = 1.5)
)
public BudgetApiResponse sendExpenseData(BudgetExpenseRequest request) { ... }

@Recover
public BudgetApiResponse recoverSendExpenseData(RestClientException e, BudgetExpenseRequest request) {
    log.error("...");
    return null;
}

@Override
@Retryable(
    label = "sendCancellation",
    retryFor = {RestClientException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 2000, multiplier = 1.5)
)
public BudgetApiResponse sendCancellation(BudgetCancellationRequest request) { ... }

@Recover
public BudgetApiResponse recoverSendCancellation(RestClientException e, BudgetCancellationRequest request) {
    log.error("...");
    return null;
}
```
`label`을 명시하면 Spring Retry가 recover 메서드를 정확히 매칭합니다. (Spring Retry 1.3.2+)

## Warnings

### WR-01: `attemptCount`가 CANCEL 이벤트 로그에 항상 기본값 1로 기록됨

**File:** `backend/src/main/java/com/micesign/budget/BudgetIntegrationService.java:170-187`
**Issue:** `handleCancellationEvent()`에서 `BudgetIntegrationLog`를 생성할 때 `budgetLog.setAttemptCount()`를 호출하지 않습니다. 성공/실패 무관하게 `attempt_count`는 항상 기본값 1이 됩니다. `handleBudgetEvent()`의 성공 경로(line 119)에서도 마찬가지로 `setAttemptCount(1)`을 명시적으로 설정하지만, 실제 retry 횟수(1~3)를 반영하지 않습니다. retry가 2번 발생한 경우에도 성공으로 기록된 attempt_count는 1이 됩니다.
**Fix:** Spring Retry의 `RetryContext` 또는 `@Retryable`의 `recover` 메서드에서 실제 시도 횟수를 캡처하거나, 최소한 실패 로그에는 `maxAttempts`(3)를 기록하도록 수정합니다.
```java
// 실패 경로에서 실제 시도 횟수를 알 수 없으면 최댓값 명시
budgetLog.setAttemptCount(3); // null response = all retries exhausted
```

---

### WR-02: `BudgetDataExtractor.extract()`가 JSON 파싱 실패 시 부분 완료된 request를 반환

**File:** `backend/src/main/java/com/micesign/budget/BudgetDataExtractor.java:57-62`
**Issue:** `objectMapper.readValue(formDataJson, Map.class)` 실패 시 catch 블록에서 `request.setTotalAmount(0L)`, `request.setDetails(Map.of("error", e.getMessage()))`를 설정하고 return합니다. 이 request는 `BudgetIntegrationService`에서 그대로 budget API로 전송됩니다(`sendExpenseData(request)`). `totalAmount=0`, `details={"error": "..."}` 인 페이로드가 외부 예산 시스템에 SUBMIT으로 전송되면 예산 시스템에서 잘못된 데이터가 등록될 수 있습니다.
**Fix:** JSON 파싱 실패는 복구 불가능한 상황이므로 예외를 호출자에게 전파하거나, 호출자가 처리할 수 있도록 별도 상태를 반환합니다.
```java
} catch (Exception e) {
    log.error("Failed to extract budget data: templateCode={}, error={}", templateCode, e.getMessage());
    // 잘못된 데이터를 API로 보내지 않도록 예외 전파
    throw new BudgetDataExtractionException("Form data parsing failed for " + templateCode, e);
}
```
`BudgetIntegrationService`의 catch-all에서 이미 예외를 처리하므로 FAILED 로그로 올바르게 기록됩니다.

---

### WR-03: `BudgetIntegrationLogRepository.findByDocumentIdAndEventType()`은 단일 결과를 보장할 수 없음

**File:** `backend/src/main/java/com/micesign/repository/BudgetIntegrationLogRepository.java:13`
**Issue:** 같은 `document_id` + `event_type` 조합으로 로그가 여러 건 저장될 수 있습니다(재시도, 오류 후 재전송 등). `Optional<BudgetIntegrationLog>`를 반환하는 `findByDocumentIdAndEventType`은 결과가 2건 이상이면 `IncorrectResultSizeDataAccessException`을 던집니다. 현재 이 메서드를 호출하는 코드가 review 범위에 없지만, 해당 repository 메서드가 존재한다는 것 자체가 잘못된 가정을 내포합니다.
**Fix:** 반환 타입을 `List<BudgetIntegrationLog>`로 변경하거나, 가장 최신 로그를 가져오도록 쿼리를 명시합니다.
```java
// 최신 로그 조회
Optional<BudgetIntegrationLog> findFirstByDocumentIdAndEventTypeOrderByCreatedAtDesc(
    Long documentId, String eventType);
```

---

### WR-04: `SimpleClientHttpRequestFactory` timeout 단위 불일치 가능성

**File:** `backend/src/main/java/com/micesign/config/BudgetApiConfig.java:18-21`
**Issue:** `application.yml`에서 `connect-timeout: 3`, `read-timeout: 5`는 **초(seconds)** 단위로 보이지만, `BudgetApiConfig`에서 `@Value`로 주입받는 타입이 `int`이고 `Duration.ofSeconds(connectTimeout)`으로 변환합니다. 이 자체는 정상입니다. 그러나 YAML 값이 초인지 밀리초인지 주석이나 변수명에서 명확하지 않아, 나중에 수정할 때 `connectTimeout: 3000`으로 실수하면 3000초(50분)가 됩니다.
**Fix:** YAML 키 이름을 명확하게 하거나 주석을 추가합니다.
```yaml
budget:
  api:
    connect-timeout: 3   # seconds
    read-timeout: 5      # seconds
```
또는 `BudgetApiConfig`에서 변수명을 `connectTimeoutSeconds`로 변경합니다.

## Info

### IN-01: `BudgetApiResponse`에 `equals`/`hashCode`/`toString` 미구현 (plain class)

**File:** `backend/src/main/java/com/micesign/budget/BudgetApiResponse.java`
**Issue:** `BudgetApiResponse`, `BudgetExpenseRequest`, `BudgetCancellationRequest` 모두 일반 POJO로 `equals`/`hashCode`/`toString`이 없습니다. 테스트에서 객체 비교 시 `assertThat(response).isEqualTo(expected)`가 레퍼런스 동등성으로 평가되어 예상치 못한 테스트 실패가 발생할 수 있습니다. CLAUDE.md에서 Lombok 사용 금지이므로 Java record 전환을 고려합니다.
**Fix:** Java 17 record로 변환하면 `equals`, `hashCode`, `toString`이 자동 생성됩니다.
```java
public record BudgetApiResponse(boolean success, String message, String referenceId) {}
```
단, Jackson 역직렬화 시 `@JsonDeserialize` 또는 적절한 생성자 어노테이션이 필요합니다.

---

### IN-02: `BudgetIntegrationEvent`의 `drafterId` 필드가 실제로 사용되지 않음

**File:** `backend/src/main/java/com/micesign/event/BudgetIntegrationEvent.java:8`
**Issue:** `BudgetIntegrationEvent`는 `drafterId` 필드를 포함하지만, `BudgetIntegrationService.handleBudgetEvent()`는 이 값을 사용하지 않습니다. 대신 `documentRepository.findByIdWithDrafter()`로 drafter를 직접 조회합니다. dead field입니다.
**Fix:** `drafterId` 필드를 제거하거나, 불필요한 DB 조회를 줄이기 위해 실제로 활용합니다.

---

### IN-03: `application.yml`의 `BUDGET_API_KEY` 기본값이 mock 문자열

**File:** `backend/src/main/resources/application.yml:65`
**Issue:** `api-key: ${BUDGET_API_KEY:mock-api-key}`는 비-prod 환경에서 `mock-api-key`가 기본값으로 사용됩니다. `MockBudgetApiClient`가 활성화된 환경에서는 API key가 실제로 전송되지 않으므로 무해합니다. 그러나 개발자가 실수로 `prod` 프로파일에서 `BUDGET_API_KEY` 환경변수를 설정하지 않으면 `mock-api-key`가 실제 외부 시스템으로 전송될 수 있습니다.
**Fix:** prod 프로파일에서 API key가 반드시 환경변수로 주입되도록 기본값을 제거하고, `application-prod.yml`에서 `${BUDGET_API_KEY}` (기본값 없이)로 설정합니다.

---

_Reviewed: 2026-04-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
