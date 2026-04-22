# Phase 29: SMTP 이메일 알림 인프라 (Retrofit) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 29-smtp-retrofit
**Areas discussed:** A. 로깅·Idempotency 패턴, B. @Retryable 격리 아키텍처, C. 이메일 UX, D. 운영·테스트 환경

---

## 영역 선택

| Option | Description | Selected |
|--------|-------------|----------|
| A. 로깅·Idempotency 패턴 | PENDING-first 저장 순서와 중복 발송 방지 전략 | ✓ |
| B. 재시도 격리 아키텍처 | @Retryable + @Recover + 예외 분류 | ✓ |
| C. 이메일 UX (제목 포맷·템플릿 설계) | 제목 포맷, 참조자 처리, 5종 템플릿 공통화 | ✓ |
| D. 운영/테스트 환경 | 운영 SMTP 공급자, GreenMail/MailHog, mailExecutor | ✓ |

**User's choice:** 4개 영역 전부 선택
**Notes:** 전부 선택한다는 것은 retrofit phase지만 구현 전술을 완전 확정하겠다는 의도로 해석

---

## A. 로깅·Idempotency 패턴

### A-1: notification_log 저장 순서

| Option | Description | Selected |
|--------|-------------|----------|
| PENDING-first 3단계 | insert → send → UPDATE SUCCESS/FAILED. 연결 끊김으로 send 전에 죽어도 log 유지 | ✓ |
| send-first (현재 방식) 유지 | send 성공 후 save. Pitfall 1·17 리스크 유지 | |
| 하이브리드 (PENDING-first + REQUIRES_NEW) | 위 + NotificationLog save REQUIRES_NEW 격리 | |

**User's choice:** PENDING-first 3단계 (추천)
**Notes:** 안정성·복구 가능성 최상. V6의 PENDING enum 이 이 용도로 활용됨. RegistrationEmailService가 이미 같은 패턴.

### A-2: 중복 발송 방지 위치

| Option | Description | Selected |
|--------|-------------|----------|
| DB UNIQUE 제약 (V19 migration) | UNIQUE(document_id, event_type, recipient_id) | ✓ |
| 코드 레벨 체크만 | save 전 SELECT COUNT | |
| 중복 방지 없이 | monitoring-only | |

**User's choice:** DB UNIQUE 제약 (추천)
**Notes:** DB-level guarantee — any application bug에도 두 통 안 감. 레이스 컨디션 차단. registration 행은 document_id IS NULL이라 제약 적용 안 됨.

### A-3: 예외 분류 규칙

| Option | Description | Selected |
|--------|-------------|----------|
| transient 분류 후 RETRY 증가 | MailSendException=RETRY, Auth/Parse=즉시 FAILED | ✓ |
| 모든 Exception = RETRY | 분류 없이 3회 시도 | |
| 모든 Exception = 즉시 FAILED | 재시도 아예 없음 | |

**User's choice:** transient 분류 후 RETRY (추천)
**Notes:** FSD의 "2회 재시도" 요구 + Pitfall 체크리스트 권장안 모두 만족. 인증 오류는 재시도 의미 없음.

### A-4: stale PENDING 청소

| Option | Description | Selected |
|--------|-------------|----------|
| 방치 — 수동 운영에서 조회/청소 | Phase 29 범위에서는 수동 스크립트 문서화만 | ✓ |
| 기동 시 'PENDING 재산정' 메커니즘 | ApplicationReadyEvent에서 stale PENDING → FAILED | |
| 주기적 cron (@Scheduled) — Phase 33 이월 | 5분마다 stale 체크 | |

**User's choice:** 방치 (추천)
**Notes:** 50명 규모에서 서버 재시작 드물고 cron은 과스펙. 10분 이상 PENDING 수동 조회 스크립트만 Phase 33 런북에 문서화.

### A-5: Unique 제약 선언 위치

| Option | Description | Selected |
|--------|-------------|----------|
| Flyway + @Table indexes 둘 다 | V19 migration + @Table(uniqueConstraints=...) | ✓ |
| DB 제약만 추가, 엔티티 그대로 | ddl-auto=validate drift 감지 안 됨 | |
| 엔티티에만 선언, V19 생략 | 플라이웨이 DBA 거절 상황용 | |

**User's choice:** Flyway + @Table 둘 다 (추천)

### A-6: 기존 데이터 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 로컬/개발만 검증 — 운영 중복 없음 가정 | ALTER TABLE 단순 실행 | ✓ |
| migration 상단에 DELETE duplicate 선행 | 보수적, 어떤 환경서든 안전 | |
| warning 쿼리 + cleanup 스크립트 수동 배포 | 심사 보고 차원 | |

**User's choice:** 로컬/개발만 검증 (추천)
**Notes:** 현재는 스텁이라 구조적으로 중복 불가 — 간단한 ALTER TABLE 충분.

### A-7: Tx 경계

| Option | Description | Selected |
|--------|-------------|----------|
| save helper에 @Transactional(REQUIRES_NEW) | 각 INSERT/UPDATE 독립 커밋 | ✓ |
| listener 메서드 전체에 @Transactional | send 실패 시 log도 롤백 | |
| Tx 바운더리 없음 (암시) | 현재와 동일, 건건 커밋 보장 없음 | |

**User's choice:** save helper에 @Transactional(REQUIRES_NEW) (추천)

### A-8: WITHDRAW 중복

| Option | Description | Selected |
|--------|-------------|----------|
| determineRecipients에서 distinct by User.id | 애플리케이션 레벨 중복 제거 + DB UNIQUE 이중 방어 | ✓ |
| DB UNIQUE 제약에만 의존 | log noise 발생 | |
| 전부 받게 허용 | A-2와 모순 | |

**User's choice:** distinct by User.id (추천)

### A-9: recipient_email 필드

| Option | Description | Selected |
|--------|-------------|----------|
| 발송 시점 User.email 스냅샷 | PENDING insert 시 User.getEmail() 기록 | ✓ |
| recipient_id만 올리고 email은 NULL | audit 이력 추적 불가 | |

**User's choice:** 발송 시점 User.email 스냅샷 (추천)

### A-10: retry_count 증가 타이밍

| Option | Description | Selected |
|--------|-------------|----------|
| 각 재시도 직전 UPDATE | RetryContext.getRetryCount() 기반 실시간 반영 | ✓ |
| @Recover에서만 최종 값 | 재시도 중 status 모름 | |

**User's choice:** 각 재시도 직전 UPDATE (추천)

### A-11: 이벤트 메타 (actorId)

| Option | Description | Selected |
|--------|-------------|----------|
| 아니오, audit_log에서 조회 | DDL 변경 없음. 두 테이블 책임 분리 (Pitfall 3) | ✓ |
| NotificationLog에도 actor_id 추가 | V20 migration + 스키마 복잡도 증가 | |

**User's choice:** 아니오 (추천)

---

## B. @Retryable 격리 아키텍처

### B-1: 컴포넌트 분리

| Option | Description | Selected |
|--------|-------------|----------|
| 별도 @Component ApprovalEmailSender | Spring 프록시 체인 보장, Pitfall 2 회피 | ✓ |
| EmailService 내부 @Retryable | self-invocation으로 어노테이션 무효화 | |
| @Retryable 미사용 + 직접 loop | Thread.sleep(300000)×2, 스레드 점유 | |

**User's choice:** 별도 @Component (추천)

### B-2: @Retryable 설정

| Option | Description | Selected |
|--------|-------------|----------|
| maxAttempts=3, fixed 5분 | FSD 스펙 그대로 | ✓ |
| maxAttempts=3, exponential 1분→5분→15분 | SMTP rate limiting 적응 | |
| maxAttempts=2, fixed 2분 | 경량 — FSD와 불일치 | |

**User's choice:** maxAttempts=3, fixed 5분 (추천)

### B-3: @Recover 핸들러

| Option | Description | Selected |
|--------|-------------|----------|
| FAILED 기록 + error 로그 | notification_log 기록 + ERROR 로그 한 줄 | ✓ |
| FAILED + 운영자 알림 | 재귀 문제 가능 (알림도 실패 시) | |
| FAILED + dead-letter 테이블 | 과한 엔지니어링 | |

**User's choice:** FAILED + error 로그 (추천)

### B-4: Tx 배치

| Option | Description | Selected |
|--------|-------------|----------|
| 메서드에 Tx 없음 — save helper만 REQUIRES_NEW | A-7과 일치 | ✓ |
| send()에 @Transactional(REQUIRES_NEW) | send 실패 시 PENDING 롤백 — 재시도 응답성 손실 | |

**User's choice:** 메서드에 Tx 없음 (추천)

### B-5: 예외 선별

| Option | Description | Selected |
|--------|-------------|----------|
| retryFor=MailSendException / noRetryFor={MailAuth, MailParse} | 명시적 어노테이션 | ✓ |
| retryFor=Exception.class (전체) | 인증 오류도 3회 시도 — 계정 잠김 가능 | |
| try/catch로 직접 분기 | @Retryable 이점 소거 | |

**User's choice:** retryFor/noRetryFor 명시 (추천)

### B-6: send 인자 시그니처

| Option | Description | Selected |
|--------|-------------|----------|
| send(Document, User, NotificationEventType) | 고수준 도메인 — 응집도 ↑ | ✓ |
| send(String to, String subject, String templateName, Context ctx, Long documentId, NotificationEventType type) | RegistrationEmailService 패턴 복제 | |

**User's choice:** 고수준 도메인 시그니처 (추천)

### B-7: FAILED 모니터링

| Option | Description | Selected |
|--------|-------------|----------|
| ERROR 로그 + notification_log.status=FAILED 기록만 | 수동 조회 | ✓ |
| + Micrometer counter | Actuator 노출, Phase 33 고려 | |
| + SUPER_ADMIN 웹 배지 | Phase 1-C 소관 | |

**User's choice:** ERROR 로그만 (추천)

---

## C. 이메일 UX (제목 포맷·템플릿 설계)

### C-1: 제목 포맷

| Option | Description | Selected |
|--------|-------------|----------|
| [MiceSign] {action}: {docNumber} {title} | 현재 EmailService 포맷 유지 | ✓ |
| {docNumber} [MiceSign] {action}: {title} | Pitfall 51 권장 — docNumber-first | |
| [MiceSign][{event}] {title} ({docNumber}) | eventType 영문 노출로 사용자 친화 낮음 | |

**User's choice:** 현재 포맷 유지 (추천)
**Notes:** 로드맵 Success Criteria가 이 포맷 명시.

### C-2: REFERENCE 라인 알림

| Option | Description | Selected |
|--------|-------------|----------|
| 보내지 않음 (현재 동작 유지) | determineRecipients의 REFERENCE 필터 유지 | ✓ |
| 별도 제목 '[MiceSign] 참조' 발송 | 템플릿 6종 이상으로 확장 | |

**User's choice:** 보내지 않음 (추천)

### C-3: 템플릿 구조

| Option | Description | Selected |
|--------|-------------|----------|
| 공통 layout fragment + 이벤트별 5개가 차이만 | th:replace layout 활용. 유지보수 ↑ | ✓ |
| 5개 템플릿 완전 복제 | registration-submit.html 통째로 5회 복사 | |
| HTML + Plain-text 이중 구성 | 과한 엔지니어링 | |

**User's choice:** 공통 layout fragment (추천)

### C-4: CTA 버튼

| Option | Description | Selected |
|--------|-------------|----------|
| 단일 '문서 바로가기' → /documents/{id} | 명시적 단일 행동 유도 | ✓ |
| 전체 본문 미리보기 + CTA | PII 노출 / anti-feature | |
| CTA 2개: 문서 바로가기 + 대시보드 | 선택지 과잉 | |

**User's choice:** 단일 CTA (추천)

### C-5: From 네임

| Option | Description | Selected |
|--------|-------------|----------|
| MiceSign <noreply@사내도메인> | RegistrationEmailService 패턴 | ✓ |
| 기안자 이름 <drafter@…> | DKIM/SPF 실패 가능 | |
| Reply-To에 기안자 | 유용하나 Phase 29 스코프 확장 | |

**User's choice:** MiceSign <noreply@…> (추천)

### C-6: 본문 정보 깊이

| Option | Description | Selected |
|--------|-------------|----------|
| 메타데이터 레벨 — 문서번호·제목·기안자·이벤트 시각·CTA | PII 보호, REJECT엔 comment 포함 | ✓ |
| 미리보기 — 기본 메타 + 본문 요약 | 필드 노출 설계 부담 | |
| 제목 + 기안자 + CTA 만 (최소) | 식별 어려움 | |

**User's choice:** 메타데이터 레벨 (추천)

### C-7: 시각 스타일

| Option | Description | Selected |
|--------|-------------|----------|
| registration-submit.html 스타일 스코프 계승 | 호환성 검증된 자산 재사용 | ✓ |
| 새 헤드라인·색상 디자인 (MiceSign 브랜드) | Phase 29 스코프 초과 | |

**User's choice:** 스타일 계승 (추천)

---

## D. 운영·테스트 환경

### D-1: 운영 SMTP 공급자

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 29 범위에서는 공급자 불확정 — 환경변수만 | Phase 33 ops 런북에서 확정 | ✓ |
| 사내 릴레이 고정 가정 | application-prod.yml 하드코딩 | |
| AWS SES 선정 | 본 phase 목적 밖 | |

**User's choice:** 공급자 불확정 (추천)

### D-2: app.base-url prod

| Option | Description | Selected |
|--------|-------------|----------|
| application-prod.yml에 app.base-url 추가 + 시작 검증 | @Profile("prod") localhost 검출 시 실패 | ✓ |
| application-prod.yml 수정만, 시작 검증 없음 | 오타 시 이메일 깨진 뒤에만 감지 | |
| 별도 Phase 33에서 | 러너 타이밍 문제 | |

**User's choice:** application-prod.yml 추가 + 시작 검증 (추천)

### D-3: 테스트 도구

| Option | Description | Selected |
|--------|-------------|----------|
| GreenMail + MailHog 둘 다 | 자동화 + 시각적 검증 병행 | ✓ |
| MailHog만 (수동 중심) | CI 자동화 불가 | |
| GreenMail만 (자동화 중심) | 시각적 UAT 불가 | |

**User's choice:** GreenMail + MailHog 둘 다 (추천)

### D-4: mailExecutor 분리

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 micesign-async 유지, Phase 33 이월 | 50명 규모 현 풀 충분 | ✓ |
| Phase 29에서 @Bean("mailExecutor") core=5 max=10 queue=500 추가 | Pitfall 11 사전 차단 | |
| AsyncConfig 자체를 재설계 (mail/budget/registration 모두 분리) | Phase 29 스코프 확장 | |

**User's choice:** 기존 유지, Phase 33 이월 (추천)

### D-5: GreenMail 테스트 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 5종 이벤트 × 기본 발송 + 한글 제목 + 수신자 규칙 | 핵심 회귀 보호 | ✓ |
| 위 + retry/@Recover 경로 + UNIQUE 제약 검증 | 완결형이지만 시간 더 소요 | |
| 경량: SUBMIT 1케이스 + 한글 제목 | MVP에 부족 | |

**User's choice:** 5종 이벤트 × 기본 + 한글 + 수신자 규칙 (추천)

### D-6: CI 게이트

| Option | Description | Selected |
|--------|-------------|----------|
| audit_log COUNT=1 per action + GreenMail 수신자 규칙 | NFR-03 + 핵심 경로 | ✓ |
| 위 + p95 응답 시간 실측 | Phase 33 소관 | |
| 수동 UAT 만 | NFR-03 교정 보호 약함 | |

**User's choice:** audit_log COUNT=1 + GreenMail 규칙 (추천)

### D-7: JavaMailSender 번들 부재

| Option | Description | Selected |
|--------|-------------|----------|
| @ConditionalOnProperty("spring.mail.host") 패턴 | null-safe 주입 + stub log fallback | ✓ |
| startup 실패 | 개발자 마찰 | |
| 더미 번들 | 불필요 — ConditionalOnProperty로 해결 | |

**User's choice:** @ConditionalOnProperty (추천)

---

## Claude's Discretion

- `ApprovalEmailSender.java` 구체 배치 위치 (`service/` vs `service/email/`)
- `templates/email/layouts/` 디렉토리 분리 여부
- `ApprovalServiceAuditTest` JPA fixture 방식 (`@DataJpaTest` vs `@SpringBootTest`)
- GreenMail 정확한 버전 고정 및 gradle `testImplementation` 위치
- V19 migration SQL 문법 세부
- @Profile("prod") startup check 구체 구현

## Deferred Ideas

(CONTEXT.md의 `<deferred>` 섹션 참조)
