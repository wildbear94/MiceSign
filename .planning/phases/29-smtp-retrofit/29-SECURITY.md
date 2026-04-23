---
phase: 29
slug: smtp-retrofit
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-23
verified: 2026-04-23
---

# Phase 29 — Security: SMTP 결재 알림 인프라 (Retrofit)

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Run by `gsd-security-auditor` 2026-04-23 — 16 threats, 11 mitigate verified, 5 accept documented, 0 open.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| DB → JVM | V19 + V10 UNIQUE `uk_notification_dedup` (document_id, event_type, recipient_id) 이중 선언으로 중복 SUCCESS INSERT 물리적 차단 | notification metadata (PII-free) |
| 수신자 User.email → SMTP outbound | RETIRED/INACTIVE 필터 + `UserStatus.ACTIVE` 제약으로 비활성 사용자 메일 제외 | 이메일 주소, 문서 메타데이터 |
| ApprovalLine.comment (REJECT) → 이메일 body | Thymeleaf `th:text` 기본 HTML escape | 사용자 입력 (반려 코멘트) |
| Deploy config → prod app | APP_BASE_URL env 미주입 시 BaseUrlGuard(@Profile prod) 가 ApplicationReadyEvent 에서 startup 실패 | 배포 환경변수 |
| 리스너 레이어 → audit_log table | NFR-03 — 리스너는 audit 를 write 하지 않음 (ApprovalServiceAuditTest CI 게이트) | 없음 (write 금지 boundary) |
| GreenMail in-process SMTP → 테스트 JVM | 실 SMTP outbound 없음 | 테스트 fixture email |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-29-01-01 | Tampering | V19 migration CONSTRAINT 이름 오타 | mitigate | `uk_notification_dedup` 삼중 선언 (V19 L8, V10 L8, `NotificationLog.java:10-13`) + `ddl-auto=validate` 로 drift 감지 | closed |
| T-29-01-02 | DoS | Flyway V19 migration 적용 중 중복 데이터 | accept | 기존 `EmailService` 스텁이 구조적으로 중복 생성 불가 (CONTEXT D-A4). Pre-migration sanity query 문서화 (RESEARCH §3 L800-807) | closed |
| T-29-01-03 | Info Disclosure | BaseUrlGuard exception message 에 baseUrl 노출 | accept | 부팅 실패 로그 채널은 인프라 내부. baseUrl 자체는 PII 아님 | closed |
| T-29-01-04 | Elevation of Privilege | ApprovalEmailSender 스켈레톤 조기 호출 | mitigate | Plan 03 에서 실제 구현 완료. `EmailService.sendNotification` 의 AFTER_COMMIT 리스너만 호출 | closed |
| T-29-03-01 | Info Disclosure | 이메일 본문 PII (문서 본문) 유출 | mitigate | `ApprovalEmailSender.java:237-269` `buildContext()` 는 8개 메타데이터만 setVariable. `doc.getContent()` / `ctx.setVariable("content", ...)` grep=0 | closed |
| T-29-03-02 | Tampering | JWT 토큰 URL 포함 | mitigate | `approvalUrl = baseUrl + "/documents/" + doc.getId()` 만 조립 (sender L257). 전 템플릿에서 `token=`/`jwt=` grep=0 | closed |
| T-29-03-03 | Spoofing | From 주소 스푸핑 | accept | `From = "MiceSign <${spring.mail.username}>"` 고정. Reply-To 미사용 (D-C5). DKIM/SPF 는 Phase 33 런북 범위 | closed |
| T-29-03-04 | DoS | @Retryable 무한 재시도 | mitigate | `ApprovalEmailSender.java:100-106` `maxAttempts=3` + `noRetryFor={MailAuthenticationException, MailParseException}` + `@Backoff(delayExpression)` 상한 | closed |
| T-29-03-05 | EoP (NFR-03) | 리스너에서 audit_log 추가 INSERT | mitigate | `EmailService.java` 에 `auditLog`/`AuditLog`/`auditService` grep=0. L41-42 주석으로 NFR-03 명시 | closed |
| T-29-03-06 | Info Disclosure | errorMessage 에 credential/PII 유출 | mitigate | `ApprovalEmailSender.java:63` `ERROR_MESSAGE_MAX=255` + `truncate()` L285-288. RetryTest L162 가 길이 ≤255 assert | closed |
| T-29-04-01 | DoS | CI 빌드에서 retry 테스트 5분 대기 | mitigate | `ApprovalEmailSenderRetryTest.java:57-58` `@SpringBootTest(properties={"app.mail.retry.delay-ms=0"})`. 실행 시간 <60s | closed |
| T-29-04-02 | Info Disclosure | 테스트 fixture 이메일 누출 | accept | `@notif.test`/`@micesign.test` 도메인만. GreenMail in-process, 외부 전송 없음 | closed |
| T-29-04-03 | Tampering | @MockBean JavaMailSender 로 SMTP 흐름 우회 | accept | 의도된 unit 분리. `ApprovalNotificationIntegrationTest` 가 GreenMail 경유 실 흐름 병행 검증 | closed |
| T-29-05-01 | Info Disclosure | prod placeholder baseUrl 전송 | mitigate | `application-prod.yml:14` `${APP_BASE_URL:https://micesign.사내도메인}` + BaseUrlGuard 가 localhost 차단. DNS 해석 실패 시 배포팀 즉시 피드백 신호. Phase 33 런북에 실 도메인 주입 확인 항목 | closed |
| T-29-05-02 | Repudiation | 리스너에서 audit_log 중복 INSERT | mitigate | `ApprovalServiceAuditTest` 5개 테스트 × `isEqualTo(1)` CI 게이트 (SUBMIT/APPROVE/REJECT/WITHDRAW/fullLifecycle) | closed |
| T-29-05-03 | Tampering | 기존 RegistrationEmailService 회귀 | mitigate | `RegistrationEmailServiceTest.java:35` 현존 + 전체 회귀 스위트 green. VERIFICATION.md 7/7 must-haves | closed |

*Status: open · **closed** (all 16)*
*Disposition: mitigate (implementation verified) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-29-01 | T-29-01-02 | Flyway 중복 데이터 실패는 현재 스텁 구조상 불가능. Sanity query 로 운영 시 수동 검증 | 프로젝트 오너 | 2026-04-23 |
| R-29-02 | T-29-01-03 | BaseUrlGuard 부팅 예외 로그는 인프라 내부 채널. baseUrl 은 PII 아님 | 프로젝트 오너 | 2026-04-23 |
| R-29-03 | T-29-03-03 | 발신자 스푸핑 방어는 SMTP 서버의 DKIM/SPF 책임. Phase 33 운영 전환 런북에서 처리 | 프로젝트 오너 | 2026-04-23 |
| R-29-04 | T-29-04-02 | 테스트 이메일은 `@test` 도메인 + GreenMail in-process. 외부 누출 경로 없음 | 프로젝트 오너 | 2026-04-23 |
| R-29-05 | T-29-04-03 | @MockBean 우회는 unit test 분리 목적. IntegrationTest 가 GreenMail 로 실 흐름 커버 | 프로젝트 오너 | 2026-04-23 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-23 | 16 | 16 | 0 | gsd-security-auditor (sonnet) — ASVS L1 |

## Security Audit 2026-04-23

| Metric | Count |
|--------|-------|
| Threats found | 16 |
| Mitigate verified | 11 |
| Accept documented | 5 |
| Closed | 16 |
| Open | 0 |
| Unregistered flags | 0 |

**Audit context:**
- SUMMARY.md Threat Flags 3종 (29-01, 29-03, 29-04) 모두 "신규 위협 표면 발견되지 않음" 명시
- HUMAN-UAT.md 2/2 passed (visual rendering + NFR-02 async)
- VERIFICATION.md status: verified, 7/7 observable truths

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (5 risks)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-23 (ASVS L1, gsd-security-auditor)
