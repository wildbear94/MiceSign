# Phase 19: Registration Email Notifications - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

등록 신청 라이프사이클 이벤트(신청 접수, 승인, 거부)에 대한 이메일 알림 발송 시스템 구현. 신청자에게 상태 변경 알림, SUPER_ADMIN에게 신규 신청 알림.

기존 결재 알림 SMTP 전환, 프론트엔드 UI(Phase 20, 21), rate limiting(Phase 21)은 이 페이즈에 포함되지 않음.

</domain>

<decisions>
## Implementation Decisions

### SMTP 구현 범위
- **D-01:** 등록 알림만 실제 SMTP 발송. 기존 결재 알림(sendNotification)과 budget 알림(sendEmail)은 로그 스텁 유지.
- **D-02:** spring-boot-starter-mail 의존성 추가. JavaMailSender로 실제 발송.
- **D-03:** application.yml에 spring.mail.* 직접 설정. 비밀번호는 환경변수(${MAIL_PASSWORD})로 분리.
- **D-04:** SMTP 서버는 환경변수로 설정 가능하게 구현 (Claude 재량).
- **D-05:** 프로필 분리 — dev 환경에서는 spring.mail.* 미설정으로 SMTP 비활성화(로그만), prod만 SMTP 활성화.
- **D-06:** 등록 알림은 재시도 없음. 발송 실패 시 로그만 기록.

### 이벤트 아키텍처
- **D-07:** 별도 RegistrationNotificationEvent POJO 생성. 기존 ApprovalNotificationEvent와 완전 분리.
- **D-08:** 별도 RegistrationEventType enum 생성: REGISTRATION_SUBMIT, REGISTRATION_APPROVE, REGISTRATION_REJECT.
- **D-09:** 이벤트 발행은 RegistrationService의 submit/approve/reject 메서드에서 ApplicationEventPublisher.publishEvent() 호출.
- **D-10:** 별도 RegistrationEmailService 생성. @TransactionalEventListener(AFTER_COMMIT) + @Async로 비동기 처리. 기존 EmailService와 분리.
- **D-11:** 이벤트 페이로드는 최소: registrationRequestId + eventType만. 리스너에서 DB 조회로 필요한 정보(name, email, rejectionReason) 가져옴.
- **D-12:** SUPER_ADMIN 알림은 신청 접수(REGISTRATION_SUBMIT) 시에만 발송. 승인/거부는 SUPER_ADMIN이 직접 처리하므로 불필요.
- **D-13:** SUPER_ADMIN 목록 조회: 기존 UserRepository.findByRoleAndStatus(SUPER_ADMIN, ACTIVE) 사용.
- **D-14:** AFTER_COMMIT + @Async 패턴으로 이메일 실패가 등록 작업을 롤백하지 않음. 추가 보장 불필요.

### 이메일 템플릿 엔진
- **D-15:** Thymeleaf 사용 (spring-boot-starter-thymeleaf 의존성 추가).
- **D-16:** 4개 독립 Thymeleaf HTML 템플릿 파일:
  - `registration-submit.html` — 신청 접수 확인 (→ 신청자)
  - `registration-approve.html` — 승인 결과 (→ 신청자)
  - `registration-reject.html` — 거부 결과 + 사유 (→ 신청자)
  - `registration-admin-notify.html` — 새 신청 알림 (→ SUPER_ADMIN)
- **D-17:** 템플릿 위치: `src/main/resources/templates/email/` (기존 budget 템플릿과 동일 디렉토리)

### 이메일 내용/디자인
- **D-18:** 심플 HTML, 인라인 CSS. 로고 없이 텍스트 중심. 회사 내부 시스템이므로 화려할 필요 없음.
- **D-19:** 이메일 제목: [MiceSign] 접두사 사용. 예: "[MiceSign] 등록 신청 접수 확인"
- **D-20:** 이메일 본문 100% 한국어 (FSD 규정 준수).
- **D-21:** From 표시명: 'MiceSign <noreply@...>'
- **D-22:** 승인 이메일에 로그인 URL 포함 (app.base-url 설정 사용). '이제 로그인하실 수 있습니다' + 로그인 페이지 URL.
- **D-23:** 거부 이메일에 거부 사유 + '다시 신청하실 수 있습니다' 재신청 안내문 포함.
- **D-24:** 각 이메일에 필수 정보만: 신청확인(이름, 신청일), 승인(이름, 승인일, 로그인URL), 거부(이름, 거부사유, 재신청안내), ADMIN(신청자명, 이메일, 신청일시).
- **D-25:** SUPER_ADMIN 알림: 기본 정보만 (신청자명, 이메일, 신청일시). 관리 페이지 URL은 Phase 20 이후 추가.

### notification_log 확장
- **D-26:** Flyway 마이그레이션으로 recipient_id를 nullable로 변경. 미등록 신청자(아직 user 아닌 사람)에게 발송 시 recipient=null, recipientEmail만 설정.
- **D-27:** registration_request_id BIGINT NULL 컬럼 추가 (document_id와 대칭).
- **D-28:** 기존 event_type VARCHAR(50) 컬럼에 REGISTRATION_SUBMIT, REGISTRATION_APPROVE, REGISTRATION_REJECT 값 저장. 별도 카테고리 컬럼 불필요.
- **D-29:** NotificationLog JPA 엔티티: @JoinColumn(name="recipient_id", nullable=true) 변경. registrationRequestId 필드 추가.
- **D-30:** 기존 NotificationLogController 수정 안 함. 등록 알림은 내부 로그만.

### Claude's Discretion
- Flyway 마이그레이션 버전 번호 (V15 이후 적절한 번호)
- RegistrationEmailService 내부 메서드 구조
- Thymeleaf 템플릿 HTML/CSS 상세 디자인
- SMTP 기본 설정값 (port, TLS 등)
- app.base-url 설정 키 이름 및 기본값

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `docs/PRD_MiceSign_v2.0.md` — DB 스키마 DDL, notification_log 테이블 구조
- `docs/FSD_MiceSign_v1.0.md` — API 계약, 에러 코드, 한국어 텍스트 규정
- `.planning/REQUIREMENTS.md` §v1.3 — MAIL-01, MAIL-02, MAIL-03, MAIL-04 요구사항

### 기존 이메일 인프라
- `backend/src/main/java/com/micesign/service/EmailService.java` — 기존 결재 알림 서비스 (스텁). 패턴 참조용.
- `backend/src/main/java/com/micesign/event/ApprovalNotificationEvent.java` — 기존 이벤트 POJO. RegistrationNotificationEvent 설계 참조.
- `backend/src/main/java/com/micesign/domain/enums/NotificationEventType.java` — 기존 이벤트 타입 enum. 별도 RegistrationEventType 생성.
- `backend/src/main/java/com/micesign/domain/NotificationLog.java` — 알림 로그 엔티티. recipient nullable 변경, registrationRequestId 추가 필요.
- `backend/src/main/resources/templates/email/budget-failure-notification.html` — 기존 Thymeleaf 템플릿 참조.

### 등록 백엔드 (Phase 18)
- `backend/src/main/java/com/micesign/service/RegistrationService.java` — 이벤트 발행 추가 대상 (submit/approve/reject)
- `backend/src/main/java/com/micesign/domain/RegistrationRequest.java` — 등록 신청 엔티티 구조
- `backend/src/main/java/com/micesign/repository/RegistrationRequestRepository.java` — 이벤트 리스너에서 조회용
- `.planning/phases/18-registration-backend/18-CONTEXT.md` — Phase 18 결정사항 참조

### DB 스키마
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — notification_log 원본 DDL (document_id는 이미 nullable)
- `backend/src/main/resources/db/migration/V6__add_pending_notification_status.sql` — PENDING 상태 추가 마이그레이션

### 인프라
- `backend/src/main/java/com/micesign/repository/UserRepository.java` — findByRoleAndStatus() 메서드 (SUPER_ADMIN 조회)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmailService.sendToRecipient()` — NotificationLog 저장 패턴 참조 (새 서비스에서 유사하게 구현)
- `@TransactionalEventListener + @Async` 패턴 — 기존 EmailService에서 확립됨
- `UserRepository.findByRoleAndStatus()` — SUPER_ADMIN 목록 조회에 바로 사용 가능
- `NotificationLogRepository` — 알림 로그 저장에 재사용
- `budget-failure-notification.html` — Thymeleaf 템플릿 참조 (이미 templates/email/ 경로 존재)

### Established Patterns
- Spring Event 기반 비동기 알림: 서비스에서 publishEvent() → 리스너에서 @Async 처리
- NotificationLog: 수신자, 이메일, 이벤트 타입, 상태, 에러 메시지 저장
- Flyway 마이그레이션: `V{N}__description.sql` 형식

### Integration Points
- `RegistrationService.submitRegistration()` — REGISTRATION_SUBMIT 이벤트 발행 추가
- `RegistrationService.approveRegistration()` — REGISTRATION_APPROVE 이벤트 발행 추가
- `RegistrationService.rejectRegistration()` — REGISTRATION_REJECT 이벤트 발행 추가
- `build.gradle` — spring-boot-starter-mail, spring-boot-starter-thymeleaf 의존성 추가
- `application.yml` — spring.mail.*, app.base-url 설정 추가
- `notification_log` 테이블 — Flyway로 recipient_id nullable + registration_request_id 추가

</code_context>

<specifics>
## Specific Ideas

- 신청자에게 보내는 이메일은 recipient_id=null (아직 user 아님). recipientEmail만 설정.
- SUPER_ADMIN에게 보내는 이메일은 recipient_id 있음 (기존 user).
- 승인 이메일의 로그인 URL: `${app.base-url}/login` 형태.
- 거부 이메일: 거부 사유 표시 + "다시 신청하실 수 있습니다" 안내문.
- dev 환경: spring.mail.* 미설정 시 로그만 출력하도록 조건부 처리 (JavaMailSender Bean 없으면 로그 폴백).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-registration-email-notifications*
*Context gathered: 2026-04-08*
