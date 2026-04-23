
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

## Plan 05 Re-confirmed (2026-04-23)

**ApprovalWorkflowTest 3건 fail 재확인 (worktree base 7535a60 동일):**
- `approveDocument_success`, `rejectDocument_withComment`, `rewriteDocument_success` — Status expected:200 but was:500
- Plan 05 작업(application-prod.yml + ApprovalServiceAuditTest)과 무관한 사전 회귀
- Plan 04 시점 기록(404)과 현재 결과(500) 차이는 라우팅 설정 변경 때문일 수 있으나 — endpoint 자체는 ApprovalController에 여전히 미구현 상태로 일치
- Plan 05 ApprovalServiceAuditTest 는 동일한 기능을 service 직접 호출로 검증하므로, ApprovalController endpoint backfill 후에는 ApprovalWorkflowTest 가 자연스럽게 동작 가능

**RegistrationServiceTest 컴파일 에러 (Plan 05 fix):**
- 문제: Phase 29-03에서 `AuditLogService.log(..., String detailsJson)` overload 추가로 `verify().log(..., any())` 가 ambiguous → compileTestJava 전체가 fail
- 원인: 회귀 fix 가 base 에 누락되어 있었음 (Plan 03/04가 인지 못함 — registration 패키지는 Plan 03 변경 영향에서 제외 가정했지만 실제로는 AuditLogService 시그니처 변경이 cross-package 영향)
- Plan 05 fix: `any()` → `anyMap()` (RegistrationService 가 Map.of(...) 사용)
- Plan 05 자체 task 의 컴파일 verify 가 trigger 하여 발견 + 즉시 수정 (Rule 1 회귀 픽스)

