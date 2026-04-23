
## Plan 04 Discovered (2026-04-23)

**Pre-existing failures (out-of-scope, base bugs):**
- `com.micesign.document.ApprovalWorkflowTest`:
  - `approveDocument_success()`: POST `/api/v1/approvals/{id}/approve` returns 404 — endpoint not in ApprovalController (only GET pending/completed exist)
  - `rejectDocument_withComment()`: same root cause
  - `rewriteDocument_success()`: same root cause
- These tests reference endpoints that ApprovalController does not implement (missing approve/reject/withdraw POST handlers).
- Plan 04 changes (LazyInit fix, template path fix) did not introduce these — `git log` shows ApprovalController has only GET endpoints since commit cc6153b (Phase 09).
- Plan 04 fixed the lazy-init blockers + template fragment path (Plan 02 산출물 결함 보강), and added notification_log cleanup to DocumentSubmitTest/ApprovalWorkflowTest setUp to prevent FK violation cascade — but the missing controller endpoints remain a separate phase concern.

**Recommended:** Phase 09 또는 Phase 10 audit — controller endpoint backfill + ApprovalWorkflowTest revival. 또는 해당 테스트 클래스를 build.gradle.kts compileTestJava exclude 목록에 추가 (현재는 enabled 이지만 deferred — Plan 03 SUMMARY 의 RegistrationServiceTest 결함 패턴과 동일하게 처리 가능).
