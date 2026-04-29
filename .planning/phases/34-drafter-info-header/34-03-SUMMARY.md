---
phase: 34-drafter-info-header
plan: 03
subsystem: backend
tags: [backend, service, jackson, document, snapshot, transaction, test, h2-schema]

requires:
  - phase: 34-drafter-info-header
    provides: "Locked decisions D-A3/A4/A5 (snapshot at submit, draftedAt = submittedAt, immutable across status changes), D-C1~C7 (form_data JSON merge, ObjectMapper reuse, null position handling, transaction-rollback on serialization failure), D-E1 (BE integration tests). RESEARCH.md anchored insertion point at L296. PATTERNS.md anchored audit-log try/catch SoT and TestTokenHelper API."

provides:
  - "DocumentService.submitDocument() merges drafterSnapshot (departmentName / positionName / drafterName / draftedAt) into document_content.form_data on every DRAFT → SUBMITTED transition"
  - "Snapshot capture is null-safe (LinkedHashMap merge preserves existing keys; empty/null formData starts from empty map; positionName key always emitted with JSON null when User.positionId is null)"
  - "D-C7 transaction rollback on JsonProcessingException via RuntimeException(\"DOC_SNAPSHOT_FAILED\", e) — rejects RESEARCH option B (swallow + log.warn) per Q2=A user decision"
  - "DocumentSubmitTest extended with 3 integration tests: positive capture, null-position, immutability across withdraw transition"
  - "Test-side schema alignment: V18__align_user_position_nullable.sql brings the H2 test schema in line with production V1 (`user.position_id NULL`)"
  - "Helper variants createGeneralDraftAs(title, token) and addApprovalLineFor(docId, approverId) for tests with non-default drafters"

affects:
  - "Phase 34-04 (FE DrafterInfoHeader integration) — can now read JSON.parse(doc.formData).drafterSnapshot for SUBMITTED docs"
  - "Phase 34-05 (form template integration) — relies on snapshot presence per template"
  - "Phase 7 (approve/reject endpoints) — must not modify form_data to preserve D-C5 immutability invariant"
  - "Future audit log changes — D-C7 throw pattern now diverges from L314~319 audit-log swallow; document the divergence on touch"

tech-stack:
  added: []
  patterns:
    - "Per-method JSON keys-merge inside an existing @Transactional service method (LinkedHashMap order-preserving + ObjectMapper readValue/writeValueAsString)"
    - "Selective transaction-rollback on Jackson failure via RuntimeException re-throw (overrides the `swallow + log.warn` audit-log SoT in the same method — divergence is comment-documented)"
    - "Test-schema alignment migration (V18) when test/production schema drift blocks a behavior the plan must verify"

key-files:
  created:
    - "backend/src/test/resources/db/testmigration/V18__align_user_position_nullable.sql"
    - ".planning/phases/34-drafter-info-header/deferred-items.md"
  modified:
    - "backend/src/main/java/com/micesign/service/DocumentService.java"
    - "backend/src/test/java/com/micesign/document/DocumentSubmitTest.java"

key-decisions:
  - "Test C (snapshotImmutableAfterStatusChange) uses POST /withdraw instead of POST /approve because /api/v1/approvals/{id}/approve is not yet implemented (Phase 7); withdrawDocument() does not touch formData per RESEARCH so it is a valid invariant probe"
  - "D-C7 rollback path is defensive — provoking JsonProcessingException requires mocking ObjectMapper which would conflict with production reuse; the throw is verified by code review, not unit test, with rationale comment in the production code"
  - "Test schema (H2) had a NOT NULL constraint on user.position_id that diverged from production (NULL). Added V18 migration to align rather than working around it in test code, since the divergence would block any future test exercising the null-position branch"

patterns-established:
  - "Pattern: keys-merge inside submit method — read existing JSON String → LinkedHashMap → put new key → writeValueAsString → save"
  - "Pattern: selective Jackson-failure rollback — log.error + throw new RuntimeException(...) inside @Transactional, with explicit comment citing the decision (D-C7) and noting the rejected alternative (option B / swallow + warn)"

requirements-completed:
  - PHASE-34-D-A3
  - PHASE-34-D-A4
  - PHASE-34-D-A5
  - PHASE-34-D-C1
  - PHASE-34-D-C2
  - PHASE-34-D-C3
  - PHASE-34-D-C4
  - PHASE-34-D-C5
  - PHASE-34-D-C6
  - PHASE-34-D-C7
  - PHASE-34-D-E1

duration: 5m 34s
completed: 2026-04-29
---

# Phase 34 Plan 03: Backend drafter snapshot capture + tests Summary

**DocumentService.submitDocument now merges a 4-field drafterSnapshot into document_content.form_data on every DRAFT → SUBMITTED transition, with transaction-rollback on Jackson failure (D-C7 / Q2=A) and 3 integration tests gating the contract.**

## Performance

- **Duration:** 5m 34s
- **Started:** 2026-04-29T05:57:26Z
- **Completed:** 2026-04-29T06:03:00Z (approx)
- **Tasks:** 2 / 2 (RED + GREEN)
- **Files modified:** 4 (2 production / 2 test, including 1 new test migration)

## Accomplishments

- **Backend snapshot capture** — `DocumentService.submitDocument()` now permanently stamps the drafter's department / position / name plus the submission timestamp into `document_content.form_data` under a new `drafterSnapshot` key. Future user dept/position changes (transfer, promotion) will not alter the historical document header (D-A5, D-C5).
- **Transaction-rollback on serialization failure (D-C7)** — `JsonProcessingException` is re-thrown as `RuntimeException("DOC_SNAPSHOT_FAILED", e)`, rolling back the entire `@Transactional` submit. The plan explicitly rejected RESEARCH option B (swallow + `log.warn`, mirroring the audit-log try/catch directly below) per Q2=A; the production code carries an inline comment citing PLAN 34-03 §rationale so the divergence from the audit-log pattern is intentional and documented.
- **3 new integration tests** — `submitDraft_capturesDrafterSnapshot` (positive path), `submitDraft_capturesDrafterSnapshot_nullPosition` (D-C4), `snapshotImmutableAfterStatusChange` (D-C5) — all PASS in GREEN. The pre-existing 9 tests in `DocumentSubmitTest` continue to pass with no regression.
- **Test schema alignment** — production V1 has `user.position_id NULL` but the H2 test V1 had it as `NOT NULL`. Added `V18__align_user_position_nullable.sql` to bring the test schema in line so the D-C4 null-position branch can be exercised. Recorded as Rule 3 deviation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write RED-phase integration tests + helpers + V18 schema migration** — `5c091fb` (test) — RED gate
2. **Task 2: Implement snapshot capture + D-C7 rollback in DocumentService** — `ba55383` (feat) — GREEN gate

**Plan metadata:** _(this commit, see Final Commit section)_

## Files Created/Modified

- **`backend/src/main/java/com/micesign/service/DocumentService.java`** (modified, +40 lines)
  - Inserted `drafterSnapshot` capture block between `document.setSubmittedAt(LocalDateTime.now())` (~L296) and `documentRepository.save(document)` (~L309).
  - Reuses the static `objectMapper` at L60; uses fully-qualified `java.util.LinkedHashMap` and `com.fasterxml.jackson.core.type.TypeReference` to avoid extra imports.
  - D-C7 throw block with rationale comment immediately above `throw new RuntimeException("DOC_SNAPSHOT_FAILED", e);`.

- **`backend/src/test/java/com/micesign/document/DocumentSubmitTest.java`** (modified, +152 lines)
  - 3 new test methods (capture, nullPosition, immutability) plus 2 helper variants (`createGeneralDraftAs`, `addApprovalLineFor`).
  - New imports: `JsonNode`, `Assertions`, `UserRole`.

- **`backend/src/test/resources/db/testmigration/V18__align_user_position_nullable.sql`** (created)
  - Drops the `NOT NULL` constraint from `"user".position_id` in the H2 test schema to match production V1's `BIGINT NULL` declaration. Required for `submitDraft_capturesDrafterSnapshot_nullPosition`.

- **`.planning/phases/34-drafter-info-header/deferred-items.md`** (created)
  - Tracks the pre-existing flakiness in `ApprovalWorkflowTest` (3 tests, optimistic locking on `NotificationLog` from `ApprovalEmailSender.persistLog`) — verified to fail on `master` before any plan changes; out of scope for this plan.

## Decisions Made

- **Test C uses /withdraw instead of /approve for the immutability probe.** The plan's example called `/api/v1/approvals/{id}/approve`, but inspection of `ApprovalController` showed only `/pending` and `/completed` are implemented (approve/reject lands in Phase 7). `withdrawDocument()` is the only post-submit transition currently exposed and RESEARCH confirmed it does not touch `formData`, so it is a valid invariant probe for D-C5.
- **Test schema alignment via new migration (V18) instead of test-code workaround.** The cleanest fix is one migration that brings the test schema into parity with production; modifying V1 directly would invalidate Flyway checksums elsewhere.
- **D-C7 rollback path verified by code review only.** Provoking `JsonProcessingException` with `String` inputs through `objectMapper.readValue/writeValueAsString` is not realistically reachable, and the only way to force it (`@MockBean ObjectMapper`) would conflict with the production static-reuse pattern at L60. Documented in the production code via inline comment so future readers know option B was deliberately rejected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking infrastructure issue] H2 test schema NOT NULL constraint on user.position_id**
- **Found during:** Task 1 (RED phase test execution)
- **Issue:** `submitDraft_capturesDrafterSnapshot_nullPosition` failed in `@BeforeEach` setup with `JdbcSQLIntegrityConstraintViolationException: NULL not allowed for column "position_id"` because the H2 test schema (`testmigration/V1__create_schema.sql` L33) declared `position_id BIGINT NOT NULL`. Production V1 (`backend/src/main/resources/db/migration/V1__create_schema.sql` L48) declares it `NULL`. The drift made it impossible to test the documented D-C4 null-position branch.
- **Fix:** Added `backend/src/test/resources/db/testmigration/V18__align_user_position_nullable.sql` with `ALTER TABLE "user" ALTER COLUMN position_id BIGINT NULL;` so the test schema mirrors production. The migration includes a header comment explaining the divergence and citing both V1 file paths.
- **Files modified:** `backend/src/test/resources/db/testmigration/V18__align_user_position_nullable.sql` (created)
- **Verification:** Re-ran `./gradlew test --tests "com.micesign.document.DocumentSubmitTest"` — Task 1 RED phase produced the expected assertion failures (snapshot absent), confirming the schema fix unblocked the test path.
- **Committed in:** `5c091fb` (with Task 1)

**2. [Plan-vs-reality micro-adjustment] Test C immutability probe uses /withdraw instead of /approve**
- **Found during:** Task 1 design
- **Issue:** Plan example used `POST /api/v1/approvals/{id}/approve` for the post-submit transition, but `ApprovalController` only exposes `/pending` and `/completed` (approve/reject are deferred to Phase 7).
- **Fix:** Switched the transition to `POST /api/v1/documents/{id}/withdraw`, which exists and is RESEARCH-verified not to touch `formData`. Same D-C5 invariant is exercised.
- **Files modified:** `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java`
- **Verification:** `snapshotImmutableAfterStatusChange` runs cleanly in GREEN.
- **Committed in:** `5c091fb` (with Task 1)

---

**Total deviations:** 2 auto-fixed (1 Rule-3 blocking infra fix, 1 plan-vs-reality test path adjustment)
**Impact on plan:** Both are necessary for the plan's verification to be meaningful — neither expands scope. The schema migration is pure parity work, and the withdraw-vs-approve switch keeps the same D-C5 invariant.

## Issues Encountered

- **Pre-existing flakiness in `ApprovalWorkflowTest`** — 3 tests (`approveDocument_success`, `rejectDocument_withComment`, `rewriteDocument_success`) fail with HTTP 500 caused by `ObjectOptimisticLockingFailureException` in `ApprovalEmailSender.persistLog`. Verified pre-existing by `git stash` + re-run on `master`. Out of scope for Plan 34-03; tracked in `deferred-items.md`.

## TDD Gate Compliance

- **RED gate:** `5c091fb test(34-03): add failing tests for drafter snapshot capture (RED)` — `submitDraft_capturesDrafterSnapshot` and `submitDraft_capturesDrafterSnapshot_nullPosition` failed with the expected assertion error ("drafterSnapshot must be present after submit"). `snapshotImmutableAfterStatusChange` passed vacuously in RED (both `before` and `after` snapshots were the same missing node) — this is acceptable because the test gains its full discriminating power post-GREEN, which the plan author flagged Test C as RECOMMENDED rather than REQUIRED.
- **GREEN gate:** `ba55383 feat(34-03): capture immutable drafter snapshot at submit (D-C1, D-C7 rollback)` — all 12 `DocumentSubmitTest` tests pass (3 new + 9 pre-existing).
- **REFACTOR gate:** Not needed — production block matches the plan's prototype verbatim.

## Forward Notes

- **Phase 34-04 (FE) integration:** Backend now stamps `drafterSnapshot` on submit. FE consumers can read `JSON.parse(doc.formData).drafterSnapshot` for SUBMITTED docs. Per D-C6, legacy SUBMITTED documents (created before this plan) will not have the key — the FE fallback path (D-D4) must handle `snapshot === null` by rendering `live` props with the "(현재 정보)" badge.
- **Phase 7 approve/reject:** When implementing the approve/reject endpoints, do NOT touch `formData` (D-C5 immutability). The current `ApprovalService` paths are clear, but the requirement should be flagged in the Phase 7 plan.
- **D-C7 divergence from audit-log pattern:** The audit-log block at L314~319 still uses the swallow + `log.warn` pattern. If a future engineer aligns "all Jackson failures should swallow", the snapshot block must remain divergent — comment block at the throw call cites the rationale.

## Verification Evidence

- `./gradlew test --tests "com.micesign.document.DocumentSubmitTest"` → BUILD SUCCESSFUL (12/12 passed)
- `./gradlew compileJava` → BUILD SUCCESSFUL
- `grep -n drafterSnapshot backend/src/main/java/com/micesign/service/DocumentService.java` → 3 matches inside `submitDocument` (comment + put call + log.error message)
- `grep -n DOC_SNAPSHOT_FAILED backend/src/main/java/com/micesign/service/DocumentService.java` → 1 match (the throw at L335)

## Self-Check: PASSED

- File `34-03-SUMMARY.md` — FOUND
- File `V18__align_user_position_nullable.sql` — FOUND
- File `deferred-items.md` — FOUND
- Commit `5c091fb` (Task 1 RED) — FOUND
- Commit `ba55383` (Task 2 GREEN) — FOUND
