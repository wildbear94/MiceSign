---
phase: 19-registration-email-notifications
plan: 01
subsystem: notification
tags: [email, thymeleaf, registration, notification]
dependency_graph:
  requires: [18-01, 18-02, 09-01]
  provides: [registration-email-infra, registration-event-types, registration-email-templates]
  affects: [notification_log, application.yml, build.gradle.kts]
tech_stack:
  added: [spring-boot-starter-mail, spring-boot-starter-thymeleaf]
  patterns: [TransactionalEventListener, optional-JavaMailSender, Thymeleaf-email-templates]
key_files:
  created:
    - backend/src/main/resources/db/migration/V16__extend_notification_log_for_registration.sql
    - backend/src/test/resources/db/testmigration/V7__extend_notification_log_for_registration.sql
    - backend/src/main/java/com/micesign/event/RegistrationEventType.java
    - backend/src/main/java/com/micesign/event/RegistrationNotificationEvent.java
    - backend/src/main/java/com/micesign/service/RegistrationEmailService.java
    - backend/src/main/resources/templates/email/registration-submit.html
    - backend/src/main/resources/templates/email/registration-approve.html
    - backend/src/main/resources/templates/email/registration-reject.html
    - backend/src/main/resources/templates/email/registration-admin-notify.html
  modified:
    - backend/build.gradle.kts
    - backend/src/main/resources/application.yml
    - backend/src/main/java/com/micesign/domain/NotificationLog.java
decisions:
  - "notification_log FK 이름: V1 DDL에서 recipient_id FK만 존재하므로 notification_log_ibfk_1 확인"
  - "H2 테스트 마이그레이션은 FK drop 없이 ALTER COLUMN으로 nullable 변경"
  - "Thymeleaf 템플릿은 th:text만 사용 (XSS 방지, T-19-01 위협 완화)"
metrics:
  duration: "3m 40s"
  completed: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 3
---

# Phase 19 Plan 01: Registration Email Infrastructure Summary

등록 이메일 알림 인프라 구축 -- spring-boot-starter-mail/thymeleaf 의존성, Flyway 마이그레이션(notification_log 확장), RegistrationEmailService(dev 로그/prod SMTP 듀얼 모드), 4개 한국어 Thymeleaf 이메일 템플릿

## Task Completion

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Gradle 의존성 + Flyway 마이그레이션 + application.yml + NotificationLog 엔티티 변경 | 40da810 | DONE |
| 2 | RegistrationEventType enum + RegistrationNotificationEvent POJO + RegistrationEmailService + 4개 Thymeleaf 템플릿 | ddce50b | DONE |

## Key Changes

### Task 1: Infrastructure Foundation
- **build.gradle.kts**: `spring-boot-starter-mail`과 `spring-boot-starter-thymeleaf` 의존성 추가
- **V16 마이그레이션 (MariaDB)**: recipient_id/recipient_email nullable 변경, FK 재생성(명명), registration_request_id 컬럼+인덱스 추가
- **V7 마이그레이션 (H2 테스트)**: ALTER COLUMN으로 nullable 변경, registration_request_id 추가
- **application.yml**: spring.mail.* SMTP 설정 (환경변수 기반), app.base-url 설정 추가
- **NotificationLog.java**: recipient/recipientEmail nullable, registrationRequestId 필드+getter/setter 추가

### Task 2: Service & Templates
- **RegistrationEventType**: REGISTRATION_SUBMIT, REGISTRATION_APPROVE, REGISTRATION_REJECT
- **RegistrationNotificationEvent**: registrationRequestId + eventType 필드를 가진 POJO
- **RegistrationEmailService**: 
  - `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` + `@Transactional(readOnly=true)`
  - JavaMailSender optional 주입 (null이면 로그 모드)
  - SUBMIT시 신청자에게 접수 확인 + SUPER_ADMIN들에게 알림
  - APPROVE시 신청자에게 승인 완료 (로그인 링크 포함)
  - REJECT시 신청자에게 거부 결과 (사유 포함)
- **4개 Thymeleaf 템플릿**: 한국어, 인라인 CSS, th:text만 사용 (XSS 방지)

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation | Verified |
|-----------|-----------|----------|
| T-19-01 | 모든 Thymeleaf 템플릿에서 th:text만 사용 (자동 HTML 이스케이프) | Yes |
| T-19-02 | SMTP 비밀번호 ${MAIL_PASSWORD:} 환경변수로 분리 | Yes |

## Verification

- `./gradlew compileJava` -- BUILD SUCCESSFUL
- V16 마이그레이션에 `MODIFY recipient_id BIGINT NULL` + `registration_request_id BIGINT NULL` 포함
- V16 마이그레이션에 FK 이름 확인 쿼리 주석 포함
- application.yml에 spring.mail.* 설정 + app.base-url 설정 존재
- 4개 Thymeleaf 템플릿 파일 templates/email/ 에 존재
- RegistrationEmailService가 @TransactionalEventListener + @Async + Optional JavaMailSender 패턴 사용

## Self-Check: PASSED

All 9 created files verified. Both commit hashes (40da810, ddce50b) confirmed.
