---
phase: 09-smtp-email-notifications
verified: 2026-04-03T00:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 9: SMTP Email Notifications Verification Report

**Phase Goal:** Users receive email notifications for all approval workflow events so they never miss a pending action or status change
**Verified:** 2026-04-03
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Approver receives email when document arrives for their approval (NTF-01) | VERIFIED | `NotificationService.resolveRecipientIds()` handles `APPROVE` case for intermediate step, returns next pending approver; `ApprovalService` publishes `ApprovalNotificationEvent(APPROVE)` at line 112 |
| 2  | Drafter receives email when document is approved or rejected (NTF-02) | VERIFIED | `resolveRecipientIds()` APPROVE branch: when `document.getStatus() == APPROVED`, returns drafter ID; REJECT branch returns drafter ID unconditionally |
| 3  | Drafter receives email when their document is withdrawn (NTF-03) | VERIFIED | `DocumentService` publishes `ApprovalNotificationEvent(WITHDRAW)` at line 285; `resolveRecipientIds()` WITHDRAW branch returns `document.getDrafter().getId()` |
| 4  | All approval line members (APPROVE/AGREE) receive email when document is submitted (NTF-04) | VERIFIED | `resolveRecipientIds()` SUBMIT branch filters `ApprovalLine` list for `APPROVE` or `AGREE` type and returns all their IDs; `DocumentService.submitDocument()` publishes `SUBMIT` event at line 194 |
| 5  | Every notification attempt is recorded in notification_log table (NTF-05) | VERIFIED | `sendWithRetry()` creates `NotificationLog` with PENDING status before first attempt; saves on every state transition (RETRY, SUCCESS, FAILED) — 7 `notificationLogRepository.save()` call sites |
| 6  | Failed emails are retried up to 2 times with 1s and 3s delays | VERIFIED | `MAX_RETRIES = 2`, `RETRY_DELAYS = {1000L, 3000L}`, retry loop in `sendWithRetry()` with `Thread.sleep(RETRY_DELAYS[attempt])` |
| 7  | Email sending never blocks the approval transaction | VERIFIED | `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` + `@Async` on `handleNotificationEvent()`; `AsyncConfig` configures dedicated `notification-` thread pool |
| 8  | SUPER_ADMIN can view paginated notification history with status/event/date filters | VERIFIED | `GET /api/v1/admin/notifications` in `NotificationLogController`; `NotificationLogSpecification.withFilters()` accepts status, eventType, startDate, endDate |
| 9  | SUPER_ADMIN can manually resend a FAILED notification | VERIFIED | `POST /api/v1/admin/notifications/{id}/resend` in `NotificationLogController.resendNotification()`, delegates to `NotificationService.resend()` |
| 10 | Non-SUPER_ADMIN users receive 403 on notification admin endpoints | VERIFIED | `@PreAuthorize("hasRole('SUPER_ADMIN')")` on class-level in `NotificationLogController` |
| 11 | SUPER_ADMIN can view notification history page at /admin/notifications | VERIFIED | `App.tsx` line 80: `<Route path="notifications" element={<NotificationLogPage />} />` inside `AdminRoute`; `NotificationLogPage` checks `user.role !== 'SUPER_ADMIN'` |
| 12 | SUPER_ADMIN can filter notifications by status, event type, and date range in UI | VERIFIED | `NotificationLogFilters.tsx` renders status select, event type select, start/end date inputs; wired through `useNotificationLogs` hook |
| 13 | Sidebar shows '알림 이력' menu item with Mail icon for SUPER_ADMIN | VERIFIED | `AdminSidebar.tsx` line 15: `{ to: '/admin/notifications', icon: Mail, labelKey: 'sidebar.notifications' }`; Korean translation `"notifications": "알림 이력"` confirmed in `public/locales/ko/admin.json` |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/main/java/com/micesign/service/NotificationService.java` | Event listener + recipient resolution + retry orchestration | VERIFIED | 239 lines; contains `@TransactionalEventListener`, `@Async`, `resolveRecipientIds()`, `sendWithRetry()`, `resend()` |
| `backend/src/main/java/com/micesign/service/EmailService.java` | SMTP email sending via JavaMailSender + Thymeleaf rendering | VERIFIED | 102 lines; uses `JavaMailSender`, `SpringTemplateEngine`, builds subject/template/variables |
| `backend/src/main/java/com/micesign/event/ApprovalNotificationEvent.java` | Single event class for all notification types | VERIFIED | POJO with `NotificationEventType`, document, actorUserId, comment fields |
| `backend/src/main/resources/templates/email/submit.html` | Thymeleaf email template for submit event | VERIFIED | Full HTML email with `th:text` bindings for documentTitle, docNumber, drafterName, statusLabel, documentUrl |
| `backend/src/main/resources/templates/email/approve.html` | Thymeleaf email template for approve event | VERIFIED | Full template with `th:text` bindings including comment field |
| `backend/src/main/resources/templates/email/reject.html` | Thymeleaf email template for reject event | VERIFIED | Full template with `th:text` bindings including comment field |
| `backend/src/main/resources/templates/email/withdraw.html` | Thymeleaf email template for withdraw event | VERIFIED | Full template with `th:text` bindings |
| `backend/src/main/java/com/micesign/config/AsyncConfig.java` | Async thread pool configuration | VERIFIED | `@EnableAsync`, `ThreadPoolTaskExecutor` with `notification-` prefix, corePool=2, maxPool=5 |
| `backend/src/main/java/com/micesign/domain/NotificationLog.java` | JPA entity for notification_log table | VERIFIED | Full entity with all required fields |
| `backend/src/main/resources/db/migration/V6__add_pending_notification_status.sql` | Migration adding PENDING status | VERIFIED | `ALTER TABLE notification_log MODIFY COLUMN status ENUM('PENDING','SUCCESS','FAILED','RETRY')` |
| `backend/src/main/java/com/micesign/controller/NotificationLogController.java` | GET /api/v1/admin/notifications + POST /{id}/resend | VERIFIED | Both endpoints present, `@PreAuthorize("hasRole('SUPER_ADMIN')")` at class level |
| `backend/src/main/java/com/micesign/specification/NotificationLogSpecification.java` | JPA Specification for filters | VERIFIED | `Specification<NotificationLog>` with status, eventType, startDate, endDate predicates |
| `backend/src/main/java/com/micesign/dto/notification/NotificationLogResponse.java` | API response DTO | VERIFIED | Java record with `recipientEmail`, `recipientName`, all required fields |
| `frontend/src/features/notification/pages/NotificationLogPage.tsx` | Main notification history page | VERIFIED | Renders `NotificationLogFilters`, `NotificationLogTable`, `Pagination`; contains SUPER_ADMIN guard |
| `frontend/src/features/notification/components/NotificationLogTable.tsx` | Paginated table with resend button | VERIFIED | Contains '재발송' button visible only for `row.status === 'FAILED'` |
| `frontend/src/features/notification/api/notificationApi.ts` | API client for notification endpoints | VERIFIED | `getLogs()` calls `/admin/notifications`, `resend()` calls `/admin/notifications/${id}/resend` |
| `frontend/src/features/notification/hooks/useNotificationLogs.ts` | TanStack Query hooks | VERIFIED | `useNotificationLogs` (useQuery) + `useResendNotification` (useMutation with cache invalidation) |
| `frontend/src/features/notification/types/notification.ts` | TypeScript types | VERIFIED | `NotificationLogResponse`, `NotificationLogFilter`, `NOTIFICATION_STATUSES`, `NOTIFICATION_EVENT_TYPES` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ApprovalService.approve()` | `ApprovalNotificationEvent` | `applicationEventPublisher.publishEvent()` | WIRED | Lines 112-113 in ApprovalService.java |
| `ApprovalService.reject()` | `ApprovalNotificationEvent` | `applicationEventPublisher.publishEvent()` | WIRED | Lines 162-163 in ApprovalService.java |
| `DocumentService.submitDocument()` | `ApprovalNotificationEvent` | `applicationEventPublisher.publishEvent()` | WIRED | Lines 194-195 in DocumentService.java |
| `DocumentService.withdrawDocument()` | `ApprovalNotificationEvent` | `applicationEventPublisher.publishEvent()` | WIRED | Lines 285-286 in DocumentService.java |
| `NotificationService.handleNotificationEvent()` | `EmailService.sendEmail()` | `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` | WIRED | `sendWithRetry()` calls `emailService.sendEmail()` within the event handler |
| `NotificationService` | `NotificationLogRepository` | `save()` on every attempt | WIRED | 7 `notificationLogRepository.save()` calls in `sendWithRetry()` and `resend()` |
| `NotificationLogController.getNotificationLogs()` | `NotificationLogRepository + NotificationLogSpecification` | `findAll(spec, pageable)` | WIRED | `notificationLogRepository.findAll(NotificationLogSpecification.withFilters(...), pageable)` |
| `NotificationLogController.resendNotification()` | `NotificationService` | `notificationService.resend()` | WIRED | Line 65 in NotificationLogController.java |
| `NotificationLogPage` | `notificationApi.getLogs()` | `useNotificationLogs` hook | WIRED | Page imports and calls `useNotificationLogs(filter, page, 20)` |
| `NotificationLogTable resend button` | `notificationApi.resend()` | `useMutation` via `useResendNotification` | WIRED | Table's `onResend(row.id)` calls `resend(id)` from `useResendNotification()` |
| `AdminSidebar` | `/admin/notifications` | `navItems` array entry | WIRED | `{ to: '/admin/notifications', icon: Mail, labelKey: 'sidebar.notifications' }` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `NotificationLogPage.tsx` | `data` (PageResponse) | `useNotificationLogs` → `notificationApi.getLogs()` → `GET /admin/notifications` → `NotificationLogRepository.findAll()` | Yes — JPA query against `notification_log` table | FLOWING |
| `NotificationLogController` | `logs` (Page of NotificationLog) | `notificationLogRepository.findAll(spec, pageable)` — real DB query | Yes | FLOWING |
| `NotificationService.handleNotificationEvent()` | `recipients` (List of User) | `userRepository.findAllById(recipientIds)` after `resolveRecipientIds()` resolves from actual `ApprovalLine` DB records | Yes | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points available without starting the Spring Boot server and MariaDB.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| NTF-01 | 09-01-PLAN.md | User receives email notification when a document arrives for their approval | SATISFIED | `resolveRecipientIds()` APPROVE intermediate branch returns next pending approver; SUBMIT branch returns all APPROVE/AGREE line members |
| NTF-02 | 09-01-PLAN.md | Drafter receives email when their document is approved or rejected | SATISFIED | `resolveRecipientIds()` APPROVE final branch and REJECT branch both return `document.getDrafter().getId()` |
| NTF-03 | 09-01-PLAN.md | Drafter receives email when their document is withdrawn by an approver action | SATISFIED | `resolveRecipientIds()` WITHDRAW branch returns drafter ID; `DocumentService.withdrawDocument()` publishes WITHDRAW event |
| NTF-04 | 09-01-PLAN.md | Approvers receive email when a document is submitted for approval workflow | SATISFIED | `resolveRecipientIds()` SUBMIT branch returns all APPROVE/AGREE line member IDs |
| NTF-05 | 09-01-PLAN.md, 09-02-PLAN.md, 09-03-PLAN.md | Notification delivery history is logged in the database (notification_log table) | SATISFIED | Backend: every attempt saved to `notification_log`; Admin API at `/api/v1/admin/notifications`; Frontend page at `/admin/notifications` with filters and resend |

All 5 requirements (NTF-01 through NTF-05) are fully satisfied. No orphaned requirements detected.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/features/notification/types/notification.ts` | 24-28 | `NOTIFICATION_STATUSES` filter array omits `RETRY` status (backend sends RETRY during retry attempts) | Info | Minor: RETRY-state notifications cannot be filtered by status in the UI. RETRY is transient and typically resolves to SUCCESS or FAILED, so practical impact is low. Badge component correctly displays RETRY. |

No blockers or warnings found. The RETRY omission from the filter constant is cosmetic — RETRY is a transient state and the badge displays it correctly.

---

### Human Verification Required

#### 1. End-to-End Email Delivery

**Test:** Submit a document with an approval line, then observe whether the approver's inbox receives the email notification with correct title, document number, drafter name, and working "문서 확인하기" link.
**Expected:** Email arrives within a few seconds, all template variables populated, CTA link navigates to the correct document URL.
**Why human:** Cannot test actual SMTP delivery, JavaMailSender behavior, or Thymeleaf rendering output without a live server and mail inbox.

#### 2. Retry Behavior on SMTP Failure

**Test:** Configure a failing SMTP endpoint in dev, submit a document, observe whether `notification_log` shows RETRY status transitioning through attempts, then FAILED after 2 retries.
**Expected:** Three rows total (or status updates): PENDING → RETRY (attempt 1) → RETRY (attempt 2) → FAILED; `retry_count = 2`.
**Why human:** Requires live server with controllable SMTP failure injection.

#### 3. Resend Flow via Admin UI

**Test:** As SUPER_ADMIN, navigate to `/admin/notifications`, filter for FAILED status, click '재발송' on a failed entry.
**Expected:** Button shows '발송 중...' during mutation, table refreshes after success, status badge changes to SUCCESS if SMTP succeeds.
**Why human:** Requires live server, browser interaction, and a real FAILED notification in the database.

---

### Gaps Summary

No gaps found. All 13 observable truths verified, all artifacts pass Levels 1–4 (exist, substantive, wired, data flowing), all key links confirmed wired. Requirements NTF-01 through NTF-05 are fully covered across the three plans.

One informational note: the `NOTIFICATION_STATUSES` constant in `frontend/src/features/notification/types/notification.ts` omits RETRY from the filter dropdown options. Since RETRY is a transient backend state that resolves quickly, this does not block any goal. It is recorded as an informational item only.

---

_Verified: 2026-04-03_
_Verifier: Claude (gsd-verifier)_
