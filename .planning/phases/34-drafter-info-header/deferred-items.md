# Phase 34 — Deferred Items (out of scope discoveries)

## Pre-existing test flakiness in ApprovalWorkflowTest

**Discovered during:** Plan 34-03 Task 2 regression run (`./gradlew test --tests "com.micesign.document.*"`)

**Tests affected:**
- `ApprovalWorkflowTest.approveDocument_success()` — fails with HTTP 500
- `ApprovalWorkflowTest.rejectDocument_withComment()` — fails with HTTP 500
- `ApprovalWorkflowTest.rewriteDocument_success()` — fails with HTTP 500

**Root cause:** `ObjectOptimisticLockingFailureException` thrown from
`ApprovalEmailSender.persistLog(ApprovalEmailSender.java:189)` —
`NotificationLog#2` "Row was updated or deleted by another transaction
(or unsaved-value mapping was incorrect)". The async email sender's
persistence path conflicts with another transaction touching the
same `notification_log` row.

**Confirmed pre-existing:** Verified by running the same test class
against `master` before introducing any Plan 34-03 changes (via
`git stash` + `./gradlew test`) — the same 3 tests failed with the
same error. No drafter-snapshot work touches `notification_log` or
`ApprovalEmailSender`.

**Scope decision:** Per `<deviation_rules>` SCOPE BOUNDARY — only
auto-fix issues DIRECTLY caused by the current task's changes. This
flakiness is pre-existing and unrelated to the form_data snapshot
change. The verification target for Plan 34-03
(`DocumentSubmitTest`) passes 12/12 including the 3 new tests.

**Recommended follow-up (out of phase 34):** Investigate
`ApprovalEmailSender.persistLog` transaction boundary against the
new dedup unique constraint introduced in V10. Likely fix is to
ensure the persist runs in a `REQUIRES_NEW` transaction or check
the dedup logic for race conditions.
