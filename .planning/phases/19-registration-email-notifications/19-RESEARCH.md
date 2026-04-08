# Phase 19: Registration Email Notifications - Research

**Researched:** 2026-04-08
**Domain:** Spring Boot Email (SMTP) + Thymeleaf Templates + Spring Events
**Confidence:** HIGH

## Summary

Phase 19는 등록 신청 라이프사이클 이벤트(신청, 승인, 거부)에 대한 이메일 알림 시스템을 구현한다. 프로젝트에 이미 `EmailService`(스텁)와 `@TransactionalEventListener + @Async` 패턴이 확립되어 있으므로, 이 패턴을 따르되 등록 전용으로 분리된 서비스를 만든다.

핵심 작업은 4가지: (1) `spring-boot-starter-mail` + `spring-boot-starter-thymeleaf` 의존성 추가, (2) `notification_log` 테이블 스키마 변경(recipient_id nullable, registration_request_id 추가), (3) `RegistrationEmailService` + `RegistrationNotificationEvent` 생성, (4) 4개 Thymeleaf HTML 이메일 템플릿 작성.

**Primary recommendation:** 기존 EmailService의 이벤트 리스너 패턴을 복제하되, 완전히 분리된 RegistrationEmailService를 만들고, notification_log FK 변경 시 MariaDB의 FK 제약조건 처리에 주의할 것.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 등록 알림만 실제 SMTP 발송. 기존 결재 알림(sendNotification)과 budget 알림(sendEmail)은 로그 스텁 유지.
- **D-02:** spring-boot-starter-mail 의존성 추가. JavaMailSender로 실제 발송.
- **D-03:** application.yml에 spring.mail.* 직접 설정. 비밀번호는 환경변수(${MAIL_PASSWORD})로 분리.
- **D-04:** SMTP 서버는 환경변수로 설정 가능하게 구현 (Claude 재량).
- **D-05:** 프로필 분리 -- dev 환경에서는 spring.mail.* 미설정으로 SMTP 비활성화(로그만), prod만 SMTP 활성화.
- **D-06:** 등록 알림은 재시도 없음. 발송 실패 시 로그만 기록.
- **D-07:** 별도 RegistrationNotificationEvent POJO 생성. 기존 ApprovalNotificationEvent와 완전 분리.
- **D-08:** 별도 RegistrationEventType enum 생성: REGISTRATION_SUBMIT, REGISTRATION_APPROVE, REGISTRATION_REJECT.
- **D-09:** 이벤트 발행은 RegistrationService의 submit/approve/reject 메서드에서 ApplicationEventPublisher.publishEvent() 호출.
- **D-10:** 별도 RegistrationEmailService 생성. @TransactionalEventListener(AFTER_COMMIT) + @Async로 비동기 처리. 기존 EmailService와 분리.
- **D-11:** 이벤트 페이로드는 최소: registrationRequestId + eventType만. 리스너에서 DB 조회로 필요한 정보(name, email, rejectionReason) 가져옴.
- **D-12:** SUPER_ADMIN 알림은 신청 접수(REGISTRATION_SUBMIT) 시에만 발송. 승인/거부는 SUPER_ADMIN이 직접 처리하므로 불필요.
- **D-13:** SUPER_ADMIN 목록 조회: 기존 UserRepository.findByRoleAndStatus(SUPER_ADMIN, ACTIVE) 사용.
- **D-14:** AFTER_COMMIT + @Async 패턴으로 이메일 실패가 등록 작업을 롤백하지 않음. 추가 보장 불필요.
- **D-15:** Thymeleaf 사용 (spring-boot-starter-thymeleaf 의존성 추가).
- **D-16:** 4개 독립 Thymeleaf HTML 템플릿 파일: registration-submit.html, registration-approve.html, registration-reject.html, registration-admin-notify.html
- **D-17:** 템플릿 위치: src/main/resources/templates/email/
- **D-18:** 심플 HTML, 인라인 CSS. 로고 없이 텍스트 중심.
- **D-19:** 이메일 제목: [MiceSign] 접두사 사용.
- **D-20:** 이메일 본문 100% 한국어.
- **D-21:** From 표시명: 'MiceSign <noreply@...>'
- **D-22:** 승인 이메일에 로그인 URL 포함 (app.base-url 설정 사용).
- **D-23:** 거부 이메일에 거부 사유 + 재신청 안내문 포함.
- **D-24:** 각 이메일에 필수 정보만.
- **D-25:** SUPER_ADMIN 알림: 기본 정보만 (신청자명, 이메일, 신청일시).
- **D-26:** Flyway 마이그레이션으로 recipient_id를 nullable로 변경.
- **D-27:** registration_request_id BIGINT NULL 컬럼 추가.
- **D-28:** 기존 event_type VARCHAR(50) 컬럼에 REGISTRATION_SUBMIT, REGISTRATION_APPROVE, REGISTRATION_REJECT 값 저장.
- **D-29:** NotificationLog JPA 엔티티: @JoinColumn(name="recipient_id", nullable=true) 변경. registrationRequestId 필드 추가.
- **D-30:** 기존 NotificationLogController 수정 안 함.

### Claude's Discretion
- Flyway 마이그레이션 버전 번호 (V15 이후 적절한 번호)
- RegistrationEmailService 내부 메서드 구조
- Thymeleaf 템플릿 HTML/CSS 상세 디자인
- SMTP 기본 설정값 (port, TLS 등)
- app.base-url 설정 키 이름 및 기본값

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAIL-01 | 기존 스텁 EmailService를 실제 SMTP 발송으로 교체 | spring-boot-starter-mail 의존성 추가, JavaMailSender 주입. 단, D-01에 따라 등록 알림만 실제 SMTP. 기존 EmailService는 스텁 유지. |
| MAIL-02 | 신청 접수 시 신청자에게 확인 이메일 발송 | RegistrationService.submit()에서 REGISTRATION_SUBMIT 이벤트 발행 -> RegistrationEmailService에서 수신 후 발송 |
| MAIL-03 | 승인/거부 시 신청자에게 결과 이메일 발송 | REGISTRATION_APPROVE, REGISTRATION_REJECT 이벤트. 거부 시 rejectionReason 포함 |
| MAIL-04 | 새 신청 접수 시 SUPER_ADMIN에게 알림 이메일 발송 | REGISTRATION_SUBMIT 이벤트에서 UserRepository.findByRoleAndStatus() 조회 후 각 SUPER_ADMIN에게 발송 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| spring-boot-starter-mail | 3.5.13 (Boot managed) | JavaMailSender, SMTP 발송 | Spring Boot BOM 관리, 별도 버전 지정 불필요 [VERIFIED: build.gradle.kts Boot 3.5.13] |
| spring-boot-starter-thymeleaf | 3.5.13 (Boot managed) | HTML 이메일 템플릿 렌더링 | Spring Boot BOM 관리 [VERIFIED: build.gradle.kts Boot 3.5.13] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jakarta.mail | Boot managed | JavaMail API | spring-boot-starter-mail에 포함 [ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Thymeleaf | FreeMarker | 이미 D-15에서 Thymeleaf 확정. 기존 budget 템플릿도 Thymeleaf 사용 중 |
| JavaMailSender | SendGrid/AWS SES | 사내 시스템이므로 직접 SMTP가 적절 |

**Installation (build.gradle.kts 추가분):**
```kotlin
implementation("org.springframework.boot:spring-boot-starter-mail")
implementation("org.springframework.boot:spring-boot-starter-thymeleaf")
```

**Version verification:** Spring Boot 3.5.13 BOM이 자동으로 호환 버전 관리. 별도 버전 명시 불필요. [VERIFIED: build.gradle.kts에서 Boot 3.5.13 확인]

## Architecture Patterns

### Recommended Project Structure
```
backend/src/main/java/com/micesign/
├── event/
│   ├── ApprovalNotificationEvent.java     # 기존 (변경 없음)
│   ├── RegistrationNotificationEvent.java # 신규 POJO
│   └── RegistrationEventType.java         # 신규 enum
├── service/
│   ├── EmailService.java                  # 기존 (스텁 유지, 변경 없음)
│   └── RegistrationEmailService.java      # 신규 (실제 SMTP 발송)
├── domain/
│   └── NotificationLog.java              # 수정 (recipient nullable, registrationRequestId 추가)
└── ...

backend/src/main/resources/
├── templates/email/
│   ├── budget-failure-notification.html   # 기존
│   ├── registration-submit.html           # 신규
│   ├── registration-approve.html          # 신규
│   ├── registration-reject.html           # 신규
│   └── registration-admin-notify.html     # 신규
├── db/migration/
│   └── V16__extend_notification_log_for_registration.sql  # 신규
└── application.yml                        # 수정 (spring.mail.*, app.base-url 추가)
```

### Pattern 1: Spring Event + Async Email
**What:** 서비스 메서드에서 이벤트 발행, 별도 리스너가 @Async로 이메일 발송
**When to use:** 이메일 발송이 비즈니스 로직을 차단하면 안 되는 경우
**Example:**
```java
// Source: 기존 EmailService.java 패턴 참조
// RegistrationService에서 이벤트 발행
@Transactional
public RegistrationStatusResponse submit(RegistrationSubmitRequest request) {
    // ... 기존 비즈니스 로직 ...
    entity = registrationRequestRepository.save(entity);
    
    // 이벤트 발행 (트랜잭션 커밋 후 리스너 실행)
    eventPublisher.publishEvent(
        new RegistrationNotificationEvent(entity.getId(), RegistrationEventType.REGISTRATION_SUBMIT)
    );
    
    return registrationMapper.toStatusResponse(entity);
}
```
[VERIFIED: 기존 EmailService.java에서 동일 패턴 확인]

### Pattern 2: Thymeleaf 서버사이드 이메일 렌더링
**What:** SpringTemplateEngine으로 HTML 템플릿을 렌더링하여 MimeMessage 생성
**When to use:** HTML 이메일 발송 시
**Example:**
```java
// Source: Spring Boot 공식 패턴
@Service
public class RegistrationEmailService {
    private final JavaMailSender mailSender;        // null if mail not configured
    private final SpringTemplateEngine templateEngine;
    
    public void sendRegistrationEmail(String to, String subject, 
                                       String templateName, Context context) {
        String html = templateEngine.process("email/" + templateName, context);
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setFrom("MiceSign <noreply@example.com>");
        helper.setText(html, true);
        mailSender.send(message);
    }
}
```
[ASSUMED: 표준 Spring Boot Mail + Thymeleaf 패턴]

### Pattern 3: Dev 환경 SMTP 비활성화 (D-05)
**What:** JavaMailSender Bean이 없으면 로그만 출력
**When to use:** dev 프로필에서 SMTP 설정 없이 실행할 때
**Example:**
```java
// RegistrationEmailService에서 조건부 처리
private final JavaMailSender mailSender; // @Autowired(required = false) or Optional

public RegistrationEmailService(@Autowired(required = false) JavaMailSender mailSender,
                                 SpringTemplateEngine templateEngine, ...) {
    this.mailSender = mailSender;
    // mailSender가 null이면 로그 모드
}
```
[ASSUMED: Spring의 Optional 주입 패턴]

### Anti-Patterns to Avoid
- **동기 이메일 발송:** 이메일 발송을 트랜잭션 내에서 직접 호출하면 SMTP 타임아웃이 사용자 응답을 지연시킴
- **기존 EmailService 수정:** D-01에 따라 기존 스텁을 건드리지 않음. 별도 서비스로 분리
- **이벤트에 과다 데이터 포함:** D-11에 따라 ID + eventType만. 리스너에서 DB 조회

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP 연결 관리 | 직접 Socket/SMTP 프로토콜 | JavaMailSender (spring-boot-starter-mail) | 커넥션 풀, TLS, 인증 자동 처리 |
| HTML 이메일 렌더링 | String concatenation | Thymeleaf SpringTemplateEngine | XSS 방지, 유지보수성 |
| MIME 메시지 구성 | jakarta.mail 직접 사용 | MimeMessageHelper | charset, multipart 처리 자동화 |
| 비동기 이벤트 처리 | 직접 Thread/ExecutorService | @TransactionalEventListener + @Async | Spring 트랜잭션 연동, 에러 핸들링 |

## Common Pitfalls

### Pitfall 1: MariaDB FK 제약조건과 NOT NULL 변경
**What goes wrong:** `ALTER TABLE notification_log MODIFY recipient_id BIGINT NULL`만 하면 FK 제약조건 때문에 실패하거나 FK가 깨질 수 있음
**Why it happens:** MariaDB에서 NOT NULL -> NULL 변경 시 FK를 재정의해야 할 수 있음
**How to avoid:** FK를 DROP 후 컬럼 MODIFY, 다시 FK ADD. 마이그레이션에서 정확한 순서로 실행
**Warning signs:** Flyway 마이그레이션 실패, `Cannot change column 'recipient_id'` 에러
```sql
-- 올바른 순서
ALTER TABLE notification_log DROP FOREIGN KEY notification_log_ibfk_1;
ALTER TABLE notification_log MODIFY recipient_id BIGINT NULL;
ALTER TABLE notification_log ADD CONSTRAINT fk_notification_log_recipient 
    FOREIGN KEY (recipient_id) REFERENCES `user`(id);
```
[VERIFIED: V1__create_schema.sql에서 `recipient_id BIGINT NOT NULL` + FK 확인]

### Pitfall 2: Thymeleaf 뷰 리졸버 충돌
**What goes wrong:** spring-boot-starter-thymeleaf 추가 시 `src/main/resources/templates/` 경로에서 웹 뷰를 찾으려 하여 REST API 응답에 영향
**Why it happens:** Thymeleaf 자동 구성이 @Controller의 반환값을 뷰 이름으로 해석
**How to avoid:** 이 프로젝트는 @RestController만 사용하므로 영향 없음. 하지만 확인 필요. 혹시 @Controller가 있으면 문제될 수 있음
**Warning signs:** 404 에러, "Template not found" 에러
[VERIFIED: 프로젝트 전체가 @RestController 사용 -- 기존 budget 템플릿도 이미 templates/email/ 경로에 존재하며 문제없이 동작 중]

### Pitfall 3: @Async + @TransactionalEventListener와 트랜잭션 컨텍스트
**What goes wrong:** 리스너 내에서 DB를 조회하려 하면 트랜잭션이 이미 커밋된 상태
**Why it happens:** AFTER_COMMIT 단계에서는 원래 트랜잭션이 종료됨. @Async로 별도 스레드에서 실행되면 새 트랜잭션 필요
**How to avoid:** 리스너 메서드에 `@Transactional(readOnly = true)` 추가하여 새 읽기 트랜잭션 시작
**Warning signs:** LazyInitializationException, "No EntityManager with actual transaction"
[VERIFIED: 기존 EmailService.sendNotification()에서 documentRepository.findByIdWithDrafter() 호출 -- @Async이므로 새 스레드에서 자동으로 새 트랜잭션 사용]

### Pitfall 4: dev 환경에서 JavaMailSender Bean 없을 때 앱 시작 실패
**What goes wrong:** spring-boot-starter-mail 추가 후 SMTP 설정 없으면 auto-configuration이 실패할 수 있음
**Why it happens:** `spring.mail.host`가 설정되지 않으면 JavaMailSender Bean이 생성되지 않음 (Spring Boot 자동 구성)
**How to avoid:** `@Autowired(required = false)`로 JavaMailSender 주입하여 Bean 없으면 로그 모드
**Warning signs:** `NoSuchBeanDefinitionException: JavaMailSender`
[ASSUMED: Spring Boot mail auto-configuration은 spring.mail.host가 있을 때만 Bean 생성]

### Pitfall 5: NotificationLog JPA 엔티티 수정 시 기존 코드 영향
**What goes wrong:** recipient를 nullable로 변경하면 기존 EmailService의 sendToRecipient()에서 문제 없지만, JPA 유효성 검사가 깨질 수 있음
**Why it happens:** `@JoinColumn(nullable = false)` → `@JoinColumn(nullable = true)` 변경 필요
**How to avoid:** NotificationLog 엔티티의 @JoinColumn과 @Column 어노테이션 모두 nullable=true로 변경. 기존 EmailService 코드는 항상 recipient를 설정하므로 영향 없음
**Warning signs:** JPA validation 에러, ConstraintViolationException
[VERIFIED: NotificationLog.java 15-19행에서 `@Column(nullable = false)` + `@JoinColumn(nullable = false)` 확인]

## Code Examples

### RegistrationNotificationEvent (신규 POJO)
```java
// Source: 기존 ApprovalNotificationEvent.java 패턴 참조
package com.micesign.event;

public class RegistrationNotificationEvent {
    private final Long registrationRequestId;
    private final RegistrationEventType eventType;

    public RegistrationNotificationEvent(Long registrationRequestId, 
                                          RegistrationEventType eventType) {
        this.registrationRequestId = registrationRequestId;
        this.eventType = eventType;
    }

    public Long getRegistrationRequestId() { return registrationRequestId; }
    public RegistrationEventType getEventType() { return eventType; }
}
```
[VERIFIED: ApprovalNotificationEvent.java 구조 참조]

### RegistrationEventType (신규 enum)
```java
package com.micesign.event;

public enum RegistrationEventType {
    REGISTRATION_SUBMIT,
    REGISTRATION_APPROVE,
    REGISTRATION_REJECT
}
```
[VERIFIED: D-08 결정사항]

### Flyway 마이그레이션 (V16)
```sql
-- V16__extend_notification_log_for_registration.sql
-- notification_log 테이블을 등록 알림 지원을 위해 확장

-- 1. recipient_id FK 제거 후 nullable로 변경
ALTER TABLE notification_log DROP FOREIGN KEY notification_log_ibfk_1;
ALTER TABLE notification_log MODIFY recipient_id BIGINT NULL;
ALTER TABLE notification_log ADD CONSTRAINT fk_notification_log_recipient 
    FOREIGN KEY (recipient_id) REFERENCES `user`(id);

-- 2. registration_request_id 컬럼 추가
ALTER TABLE notification_log ADD COLUMN registration_request_id BIGINT NULL 
    AFTER document_id;
ALTER TABLE notification_log ADD INDEX idx_registration_request (registration_request_id);
```
[VERIFIED: V1__create_schema.sql에서 원본 DDL 확인. 마지막 마이그레이션은 V15]

### application.yml 추가 설정
```yaml
spring:
  mail:
    host: ${MAIL_HOST:}
    port: ${MAIL_PORT:587}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
      mail.smtp.starttls.required: true

app:
  base-url: ${APP_BASE_URL:http://localhost:5173}
```
[ASSUMED: 표준 SMTP TLS 설정. port 587은 STARTTLS 표준]

### RegistrationService 이벤트 발행 추가 (수정)
```java
// RegistrationService에 ApplicationEventPublisher 주입 추가
private final ApplicationEventPublisher eventPublisher;

// submit() 메서드 끝에 추가
eventPublisher.publishEvent(
    new RegistrationNotificationEvent(entity.getId(), RegistrationEventType.REGISTRATION_SUBMIT)
);

// approve() 메서드 끝에 추가
eventPublisher.publishEvent(
    new RegistrationNotificationEvent(reg.getId(), RegistrationEventType.REGISTRATION_APPROVE)
);

// reject() 메서드 끝에 추가
eventPublisher.publishEvent(
    new RegistrationNotificationEvent(reg.getId(), RegistrationEventType.REGISTRATION_REJECT)
);
```
[VERIFIED: RegistrationService.java 구조 확인. ApplicationEventPublisher는 아직 주입되지 않음]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jakarta Mail 직접 사용 | Spring Boot starter-mail | Spring Boot 1.x+ | 자동 구성, 간편한 설정 |
| String concat HTML | Thymeleaf 템플릿 | N/A | 유지보수성, 보안 향상 |
| 동기 이메일 발송 | @Async + @TransactionalEventListener | Spring 4.2+ | 트랜잭션 안전성 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Spring Boot mail auto-configuration은 spring.mail.host 설정 없으면 JavaMailSender Bean 미생성 | Pitfall 4 | dev 환경에서 앱 시작 실패 가능. @Autowired(required=false)로 방어 |
| A2 | 표준 SMTP 포트 587 + STARTTLS 설정 | application.yml 예시 | SMTP 서버에 따라 다를 수 있지만 환경변수로 재설정 가능 |
| A3 | MimeMessageHelper의 UTF-8 charset 지정으로 한국어 이메일 정상 표시 | Code Examples | 대부분 메일 클라이언트에서 지원. 극히 일부 구형 클라이언트에서 문제 가능 |

**If this table is empty:** N/A -- 3개의 가정이 있으나 모두 저위험.

## Open Questions

1. **MariaDB FK 이름 확인**
   - What we know: V1에서 FK 이름을 명시하지 않아 MariaDB가 자동 생성 (`notification_log_ibfk_1` 추정)
   - What's unclear: 실제 FK 이름이 다를 수 있음
   - Recommendation: 마이그레이션 실행 전 `SHOW CREATE TABLE notification_log`로 실제 FK 이름 확인. 또는 `information_schema.TABLE_CONSTRAINTS` 조회

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Mockito (Spring Boot Test) |
| Config file | build.gradle.kts (testImplementation 설정) |
| Quick run command | `./gradlew test --tests "com.micesign.notification.*" -x compileTestJava` |
| Full suite command | `./gradlew test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAIL-01 | JavaMailSender 주입 및 SMTP 발송 | unit | `./gradlew test --tests "com.micesign.notification.RegistrationEmailServiceTest"` | Wave 0 |
| MAIL-02 | REGISTRATION_SUBMIT 이벤트 -> 신청자 확인 이메일 | unit | `./gradlew test --tests "com.micesign.notification.RegistrationEmailServiceTest.sendSubmitConfirmation"` | Wave 0 |
| MAIL-03 | REGISTRATION_APPROVE/REJECT -> 결과 이메일 | unit | `./gradlew test --tests "com.micesign.notification.RegistrationEmailServiceTest.sendApproveResult"` | Wave 0 |
| MAIL-04 | REGISTRATION_SUBMIT -> SUPER_ADMIN 알림 | unit | `./gradlew test --tests "com.micesign.notification.RegistrationEmailServiceTest.notifySuperAdmins"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `./gradlew test --tests "com.micesign.notification.*" --tests "com.micesign.registration.*"`
- **Per wave merge:** `./gradlew test`
- **Phase gate:** Full suite green before /gsd-verify-work

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/notification/RegistrationEmailServiceTest.java` -- MAIL-01~04 전체 커버
- [ ] RegistrationService 이벤트 발행 테스트 -- 기존 RegistrationServiceTest.java에 이벤트 발행 검증 추가

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A (이메일은 이벤트 기반, API 노출 없음) |
| V5 Input Validation | yes | Thymeleaf 자동 HTML 이스케이프 (XSS 방지) |
| V6 Cryptography | no | N/A (SMTP TLS는 전송 계층 암호화, 애플리케이션 레벨 아님) |

### Known Threat Patterns for Email

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 이메일 헤더 인젝션 | Tampering | MimeMessageHelper가 자동 방지 (setTo/setFrom이 헤더 값 검증) |
| Thymeleaf 템플릿 인젝션 | Tampering | 사용자 입력을 th:text로만 출력 (th:utext 사용 금지) |
| SMTP 자격증명 노출 | Information Disclosure | 환경변수(${MAIL_PASSWORD})로 분리 (D-03) |
| 이메일 폭탄 (대량 발송) | Denial of Service | 등록 API에 rate limiting (Phase 21에서 처리, SEC-01) |

## Sources

### Primary (HIGH confidence)
- `backend/src/main/java/com/micesign/service/EmailService.java` -- 기존 이벤트 리스너 패턴
- `backend/src/main/java/com/micesign/event/ApprovalNotificationEvent.java` -- 기존 이벤트 POJO 구조
- `backend/src/main/java/com/micesign/domain/NotificationLog.java` -- 현재 엔티티 구조 (nullable 변경 필요)
- `backend/src/main/resources/db/migration/V1__create_schema.sql` -- notification_log DDL (recipient_id NOT NULL, FK 확인)
- `backend/src/main/java/com/micesign/service/RegistrationService.java` -- 이벤트 발행 추가 대상
- `backend/src/main/resources/templates/email/budget-failure-notification.html` -- Thymeleaf 템플릿 참조
- `backend/build.gradle.kts` -- Spring Boot 3.5.13, 현재 의존성 목록
- `backend/src/main/resources/application.yml` -- 현재 설정 구조
- `backend/src/main/java/com/micesign/config/AsyncConfig.java` -- @EnableAsync 설정 확인

### Secondary (MEDIUM confidence)
- Spring Boot 3.x Mail auto-configuration 동작 -- mail.host 없으면 Bean 미생성

### Tertiary (LOW confidence)
- MariaDB FK 이름이 `notification_log_ibfk_1`인지 (MariaDB 자동 명명 규칙 기반 추정)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Spring Boot BOM 관리, 프로젝트 버전 확인 완료
- Architecture: HIGH -- 기존 프로젝트 패턴을 정확히 복제
- Pitfalls: HIGH -- 코드베이스에서 실제 DDL 및 엔티티 구조 확인
- DB Migration: MEDIUM -- FK 이름 확인 필요

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (안정적인 Spring Boot 스택)
