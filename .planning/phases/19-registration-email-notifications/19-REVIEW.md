---
phase: 19-registration-email-notifications
reviewed: 2026-04-08T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - backend/build.gradle.kts
  - backend/src/main/java/com/micesign/domain/NotificationLog.java
  - backend/src/main/java/com/micesign/event/RegistrationEventType.java
  - backend/src/main/java/com/micesign/event/RegistrationNotificationEvent.java
  - backend/src/main/java/com/micesign/service/RegistrationEmailService.java
  - backend/src/main/java/com/micesign/service/RegistrationService.java
  - backend/src/main/resources/application.yml
  - backend/src/main/resources/db/migration/V16__extend_notification_log_for_registration.sql
  - backend/src/main/resources/templates/email/registration-admin-notify.html
  - backend/src/main/resources/templates/email/registration-approve.html
  - backend/src/main/resources/templates/email/registration-reject.html
  - backend/src/main/resources/templates/email/registration-submit.html
  - backend/src/test/java/com/micesign/registration/RegistrationEmailServiceTest.java
  - backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java
  - backend/src/test/resources/db/testmigration/V7__extend_notification_log_for_registration.sql
findings:
  critical: 2
  warning: 2
  info: 3
  total: 7
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-04-08
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 19 구현은 Spring Event + `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` 조합으로 등록 이메일 알림을 처리하는 구조를 채택했으며, 전반적으로 아키텍처 설계는 올바르다. 테스트 커버리지(8개 단위 테스트)도 핵심 시나리오를 충분히 검증하고 있다.

그러나 두 가지 Critical 보안 문제가 발견되었다. `application.yml`에 DB 비밀번호와 JWT 시크릿의 fallback 기본값이 하드코딩되어 있어, 환경 변수 미설정 시 프로덕션 환경에서도 해당 값이 그대로 사용된다.

또한 `NotificationLog` 엔티티에서 `@Column`과 `@ManyToOne`이 동일 컬럼(`recipient_id`)을 이중 매핑하는 구조로 인해 `getRecipientId()` 호출 시 항상 `null`이 반환되는 버그가 존재한다.

---

## Critical Issues

### CR-01: 하드코딩된 DB 비밀번호 기본값

**File:** `backend/src/main/resources/application.yml:8`

**Issue:** `${DB_PASS:wild0235!}` 형태로 실제 DB 비밀번호가 기본값으로 하드코딩되어 있다. 환경 변수 `DB_PASS`가 설정되지 않으면 프로덕션 환경에서도 이 값이 사용된다. 소스 코드 저장소에 실제 인증 정보가 노출된다.

**Fix:**
```yaml
# 기본값을 빈 문자열로 변경하여 미설정 시 앱 기동 실패를 유도
datasource:
  password: ${DB_PASS}
  # 또는 기동 실패 대신 명시적 오류 메시지를 원할 경우:
  # password: ${DB_PASS:}  # 빈 값 → JDBC 연결 실패로 조기 감지
```

환경 변수 미설정 시 앱이 기동되지 않아야 문제를 조기에 감지할 수 있다. `.env.example` 파일에 필수 환경 변수 목록을 문서화하는 것을 권장한다.

---

### CR-02: 하드코딩된 JWT 시크릿 기본값

**File:** `backend/src/main/resources/application.yml:39`

**Issue:** `${JWT_SECRET:defaultDevSecretKeyThatIsAtLeast32CharsLong!!}` 형태로 예측 가능한 JWT 시크릿이 기본값으로 설정되어 있다. 환경 변수 미설정 시 이 값으로 발급된 토큰이 유효하게 처리된다. 공격자가 이 시크릿을 알면 임의의 JWT 토큰을 위조할 수 있다.

**Fix:**
```yaml
jwt:
  secret: ${JWT_SECRET}
  # 기본값 제거 — 미설정 시 앱 기동 실패
```

DB 비밀번호와 동일하게 기본값 없이 환경 변수만으로 설정해야 한다.

---

## Warnings

### WR-01: NotificationLog.getRecipientId()가 항상 null 반환

**File:** `backend/src/main/java/com/micesign/domain/NotificationLog.java:15-20`

**Issue:** `recipient_id` 컬럼에 `@Column(insertable=false, updatable=false)`와 `@ManyToOne @JoinColumn`이 동시에 선언되어 있다. 이 패턴은 JPA에서 연관 관계를 통해 FK를 관리하도록 하는 올바른 구조이나, `@Column`으로 선언된 `recipientId` 필드는 JPA가 직접 채우지 않는다(`insertable=false, updatable=false`이므로). `em.find()` 또는 JPQL 조회 시 `getRecipientId()`는 항상 `null`을 반환한다.

```java
// 현재 코드 (line 15-20)
@Column(name = "recipient_id", nullable = true, insertable = false, updatable = false)
private Long recipientId;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "recipient_id", nullable = true)
private User recipient;
```

이 값을 실제로 사용하는 코드(예: notification log 조회 쿼리)가 있다면 버그가 발생한다.

**Fix:**
```java
// 옵션 1: recipientId를 파생 프로퍼티로 변환 (연관 관계에서 읽기)
public Long getRecipientId() {
    return recipient != null ? recipient.getId() : null;
}
// recipientId 필드와 @Column 선언 제거

// 옵션 2: @Column 필드를 그대로 유지하되 Hibernate의 @Formula 사용
// 단, 이미 @ManyToOne이 있으므로 옵션 1이 더 간결하다
```

---

### WR-02: @Async + @TransactionalEventListener — notificationLogRepository.save() 트랜잭션 부재

**File:** `backend/src/main/java/com/micesign/service/RegistrationEmailService.java:72-74, 186`

**Issue:** `handleRegistrationEvent`는 `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` 조합으로 실행된다. `@Async`로 인해 별도 스레드에서 실행되며, 이 시점에는 원래 트랜잭션이 이미 커밋된 상태이므로 활성 트랜잭션이 없다. `notificationLogRepository.save(notifLog)` 호출(line 186)은 새 트랜잭션을 필요로 하는데, Spring Data JPA의 `SimpleJpaRepository.save()`는 `@Transactional`이 선언되어 있어 기본적으로 새 트랜잭션을 시작한다. 따라서 현재 코드는 동작하지만, 이 의존성이 명시적으로 표현되어 있지 않아 미래 리팩토링 시 실수가 발생할 수 있다.

더 중요한 문제는, `sendEmail` 내부의 `try/catch` 블록 밖에서 `notificationLogRepository.save(notifLog)`를 호출(line 186)하고 있어, save 자체가 실패하면 그 예외가 `handleRegistrationEvent`의 외부 `catch`로 전파되어 로그만 남고 무시된다.

**Fix:**
```java
// handleRegistrationEvent 또는 sendEmail 메서드에 @Transactional(propagation = Propagation.REQUIRES_NEW) 추가
// 또는 sendEmail 내부 try/catch를 확장하여 save 실패도 처리

private void sendEmail(/* ... */) {
    NotificationLog notifLog = new NotificationLog();
    // ... 설정 ...

    try {
        if (mailSender == null) {
            log.info("[EMAIL STUB] To: {}, Subject: {}", to, subject);
            notifLog.setStatus(NotificationStatus.SUCCESS);
            notifLog.setSentAt(LocalDateTime.now());
        } else {
            // ... SMTP 발송 ...
        }
    } catch (Exception e) {
        log.error("등록 이메일 발송 실패: to={}, error={}", to, e.getMessage());
        notifLog.setStatus(NotificationStatus.FAILED);
        notifLog.setErrorMessage(e.getMessage());
    }

    try {
        notificationLogRepository.save(notifLog);  // save 실패를 별도로 처리
    } catch (Exception e) {
        log.error("NotificationLog 저장 실패: to={}, error={}", to, e.getMessage());
    }
}
```

---

## Info

### IN-01: build.gradle.kts — Spring Boot 버전이 CLAUDE.md 권장과 다름

**File:** `backend/build.gradle.kts:3`

**Issue:** `id("org.springframework.boot") version "3.5.13"` 사용 중이나, CLAUDE.md의 스택 검증 표는 `Spring Boot 3.4.x`를 권장한다. `3.5.x`는 최신 안정 버전일 수 있으나 프로젝트 문서와 불일치한다.

**Fix:** CLAUDE.md를 현재 버전으로 업데이트하거나, 의도적으로 `3.5.x`를 사용한다면 사유를 문서화한다.

---

### IN-02: 테스트 마이그레이션(V7)과 프로덕션 마이그레이션(V16) 의미적 차이

**File:** `backend/src/test/resources/db/testmigration/V7__extend_notification_log_for_registration.sql:1-5`

**Issue:** 테스트 마이그레이션은 H2 호환을 위해 FK DROP/RE-ADD를 생략했다. 의도적인 설계이지만, V16에서 FK 이름을 `notification_log_ibfk_1`에서 `fk_notification_log_recipient`로 변경하는 내용이 테스트 환경에는 반영되지 않는다. 향후 FK 이름 기반 쿼리나 마이그레이션이 생기면 테스트/프로덕션 간 불일치가 발생할 수 있다.

**Fix:** 주석으로 H2 제약으로 인해 FK 재생성을 생략했음을 명시한다.
```sql
-- H2 호환: FK DROP/ADD는 MariaDB 전용이므로 생략 (V16 참조)
ALTER TABLE notification_log ALTER COLUMN recipient_id BIGINT NULL;
```

---

### IN-03: 관리자 알림 이메일에 등록 관리 페이지 링크 없음

**File:** `backend/src/main/resources/templates/email/registration-admin-notify.html:1-45`

**Issue:** 관리자에게 새 등록 신청을 알리는 이메일에 등록 관리 페이지로 바로 이동하는 링크가 없다. 관리자는 직접 시스템에 접속해 신청 목록을 찾아야 한다. 승인/거부 이메일(`registration-approve.html`)에는 로그인 버튼이 있는 것과 대조적이다.

**Fix:**
```html
<!-- 관리자 알림 이메일에 관리 페이지 링크 추가 -->
<div style="text-align:center; margin:24px 0;">
    <a th:href="${adminUrl}" style="display:inline-block; background-color:#2563eb; ...">
        등록 신청 검토하기
    </a>
</div>
```
`RegistrationEmailService.notifySuperAdmins()`에서 `ctx.setVariable("adminUrl", baseUrl + "/admin/registrations")` 추가.

---

_Reviewed: 2026-04-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
