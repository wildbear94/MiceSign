---
phase: 34-drafter-info-header
plan: 02
subsystem: auth
tags:
  - backend
  - java
  - spring-boot
  - jpa
  - jwt
  - dto
  - integration-test

# Dependency graph
requires:
  - phase: 34-drafter-info-header
    provides: "Phase 34 latent bug fix (Plan 01) — DocumentDetailResponse FE flat type alignment"
provides:
  - "UserProfileDto record now exposes departmentName + positionName (nullable) — single SoT for both login and refresh response payloads"
  - "AuthService.buildUserProfile null-safe LAZY join for User → Department / Position name extraction"
  - "Backend SoT for FE DRAFT-mode DrafterInfoHeader (D-D2) when documentId === null and no existingDoc available"
affects:
  - 34-03 (BE snapshot capture in DocumentService.submit) — orthogonal data path; this plan covers the DRAFT live-data path only
  - 34-04 (FE UserProfile interface extension + authStore consumption) — REQUIRES this plan's backend changes; FE tsc CANNOT detect the field mismatch
  - 34-05+ (DrafterInfoHeader component integration into 14 form callsites) — depends on FE 34-04 wiring

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Null-safe LAZY join via DocumentMapper L21~24 SoT replicated in AuthService.buildUserProfile"
    - "Record extension by appending nullable fields preserves backward-compat with positional pattern matching"

key-files:
  created: []
  modified:
    - "backend/src/main/java/com/micesign/dto/auth/UserProfileDto.java (8 components, +2 nullable Strings)"
    - "backend/src/main/java/com/micesign/service/AuthService.java (buildUserProfile body extended)"
    - "backend/src/test/java/com/micesign/auth/AuthControllerTest.java (+1 integration test method)"

key-decisions:
  - "Record fields appended after mustChangePassword (last position) to preserve any positional-pattern-matching backward-compat — none found in repo, but defensive."
  - "No additional @Transactional needed — class-level @Transactional on AuthService (L26) already covers login() and refresh() call paths, eliminating LazyInitializationException risk for the new LAZY proxy access."
  - "LoginResponse / RefreshResponse records left untouched — both wrap UserProfileDto, so 2 new fields propagate transitively to both endpoints (no DTO duplication)."
  - "Integration test asserts key-presence per D-C4 convention; departmentName non-null assertion specific to V2-seeded SUPER_ADMIN (departmentId=1); positionName value-null tolerated (V2 seed dependency)."

patterns-established:
  - "Pattern A — Null-safe LAZY join in DTO factory: copy DocumentMapper L21~24 (`entity.getX() != null ? entity.getX().getName() : null`) verbatim into any service-layer DTO assembly that needs LAZY-joined nominal data."
  - "Pattern B — Single private buildUserProfile factory shared by login() AND refresh() — same pattern propagation point for any future field additions to the user identity payload."

requirements-completed:
  - PHASE-34-D-F1
  - PHASE-34-D-F2
  - PHASE-34-D-F3
  - PHASE-34-D-F4
  - PHASE-34-D-F5

# Metrics
duration: 2m 11s
completed: 2026-04-29
---

# Phase 34 Plan 02: UserProfile backend extension Summary

**UserProfileDto record extended with `departmentName` + `positionName` (null-safe LAZY join) — single SoT now powers both login and refresh response payloads, unblocking FE DRAFT-mode DrafterInfoHeader data source.**

## Performance

- **Duration:** 2m 11s
- **Started:** 2026-04-29T05:50:34Z
- **Completed:** 2026-04-29T05:52:45Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments
- UserProfileDto record extended from 6 to 8 components — `departmentName` and `positionName` (both nullable Strings) appended after `mustChangePassword`.
- `AuthService.buildUserProfile()` now extracts dept/position names via the canonical DocumentMapper L21~24 null-safe LAZY join pattern. Both `login()` and `refresh()` call paths transitively serialize the new fields with zero call-site changes.
- New integration test `AuthControllerTest.login_responseIncludesDeptAndPosition` asserts the JSON payload exposes both keys; full AuthControllerTest suite (7 tests) green; AuthServiceTest (1 test) green — zero regression.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend UserProfileDto record with departmentName + positionName fields (D-F2)** — `5a93516` (feat)
2. **Task 2: Update AuthService.buildUserProfile + add login response integration test (D-F2/F5, D-E1 partial)** — `b0a34ed` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `backend/src/main/java/com/micesign/dto/auth/UserProfileDto.java` — appended `String departmentName` + `String positionName` (nullable) record components, with Phase-34 Javadoc per component.
- `backend/src/main/java/com/micesign/service/AuthService.java` — replaced 9-line `buildUserProfile(User)` with 16-line null-safe variant. Class-level `@Transactional` (L26) preserves LAZY proxy attachment on both `login()` and `refresh()` call paths.
- `backend/src/test/java/com/micesign/auth/AuthControllerTest.java` — added `login_responseIncludesDeptAndPosition()` (~30 lines) — POSTs to `/api/v1/auth/login` with V2-seeded SUPER_ADMIN credentials, asserts both `data.user.departmentName` (non-null) and `data.user.positionName` (key-present per D-C4) in the response payload.

## Annotation Deltas (per `<output>` SUMMARY requirement)

- **`@Transactional` on `login(...)` / `refresh(...)`:** **NOT added — already covered by class-level `@Transactional` annotation at AuthService L25~26.**
  - Verified by reading AuthService.java L25~26 (`@Service` + `@Transactional` on the class) — every public method on `AuthService` runs inside a managed Spring transaction by default.
  - Therefore the new LAZY proxy access (`user.getDepartment().getName()`, `user.getPosition().getName()`) inside `buildUserProfile` is safe — the proxy stays attached for the duration of the transactional method call.
  - RESEARCH "Pitfall 1" mitigation satisfied by existing class-level annotation — no code change required for LAZY safety. This is documented inline as a comment on `buildUserProfile`.

## Test Delta

- **New:** `AuthControllerTest.login_responseIncludesDeptAndPosition()` — 1 new method, ~30 lines, uses existing harness (`@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")`) and existing seeded SUPER_ADMIN credentials.
- **Unchanged:** All 6 pre-existing AuthControllerTest cases (`loginSuccess`, `loginInvalidCredentials`, `refreshSuccess`, `refreshTokenReuse`, `logoutSuccess`, `accountLockout`) — pass unchanged.
- **Regression sweep:** `AuthServiceTest` (1 test) — green. No other auth-related test files modified.

JUnit XML evidence (`build/test-results/test/TEST-com.micesign.auth.AuthControllerTest.xml`):
```
<testsuite name="com.micesign.auth.AuthControllerTest" tests="7" skipped="0" failures="0" errors="0">
  <testcase name="login_responseIncludesDeptAndPosition()" .../>  <!-- NEW -->
  ...
</testsuite>
```

## Decisions Made

- **Field append order at end of record (after `mustChangePassword`)** — preserves backward-compat for any code using positional pattern matching (none found in repo, but defensive). Plan §`<behavior>` mandate honored.
- **No `@Transactional(readOnly = true)` retrofit** — class-level `@Transactional` already in place since the original AuthService design. Adding `readOnly = true` to specific methods would have been a behavioral change beyond the plan scope (would block any incidental write — `login()` does write `failedLoginCount` and `lastLoginAt` on success/failure paths).
- **Test asserts key-present, value-may-be-null for `positionName`** — V2 seed for SUPER_ADMIN does assign `position_id = 1` (verified indirectly via `accountLockout` test that inserts a USER with `position_id, 1` from the same seed table), but test is conservative per D-C4 — Jackson default serialization includes the key with null value when the field is null, which is the contract we want.

## Deviations from Plan

None — plan executed exactly as written.

The plan's contingency clause for `@Transactional` retrofit (Task 2 §Action — "if NOT transactional, add @Transactional(readOnly = true)") was evaluated and resolved to NOT-NEEDED via direct read of AuthService L25~26 — the class is already annotated `@Transactional`. This was the explicitly-allowed branch of the plan, not a deviation. Documented inline above under "Annotation Deltas".

## Issues Encountered

None.

## Self-Check: PASSED

**Files exist:**
- FOUND: `backend/src/main/java/com/micesign/dto/auth/UserProfileDto.java`
- FOUND: `backend/src/main/java/com/micesign/service/AuthService.java`
- FOUND: `backend/src/test/java/com/micesign/auth/AuthControllerTest.java`

**Commits exist:**
- FOUND: `5a93516` (feat(34-02): extend UserProfileDto record …)
- FOUND: `b0a34ed` (feat(34-02): populate departmentName/positionName …)

**Verification commands re-run after final edit:**
- `./gradlew compileJava` → BUILD SUCCESSFUL
- `./gradlew test --tests "com.micesign.auth.AuthControllerTest"` → 7/7 PASS (failures=0, errors=0)
- `./gradlew test --tests "com.micesign.auth.AuthServiceTest"` → 1/1 PASS
- `grep -c "departmentName\|positionName" backend/src/main/java/com/micesign/service/AuthService.java` → 4 (≥4 expected)
- `grep -c "String departmentName\|String positionName" backend/src/main/java/com/micesign/dto/auth/UserProfileDto.java` → 2 (==2 expected)

## Next Phase Readiness — Forward Note for 34-04

**FE UserProfile interface MUST be extended in lockstep.**

`frontend/src/types/auth.ts` (L1~8) currently declares:
```ts
export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  departmentId: number;
  mustChangePassword: boolean;
}
```

After this plan, the backend `/api/v1/auth/login` and `/api/v1/auth/refresh` responses now include `departmentName` and `positionName` in `data.user.*`. **TypeScript cannot detect the runtime mismatch** — the FE will silently drop the fields if the interface is not extended. Plan 34-04 must add:
```ts
  departmentName: string | null;
  positionName: string | null;
```
to `UserProfile`. This unblocks `DocumentEditorPage.tsx` reading `user?.departmentName` for new-doc DRAFT mode (D-D2 / D-F1).

**No blockers** for follow-on plans. Backend wave-1 work for Phase 34 complete.

## Threat Flags

None — no new endpoints, no new auth surface, no new file/network access. The new fields expose data ALREADY accessible to the SAME user via `/api/v1/documents/{id}` (`DocumentDetailResponse.{departmentName, positionName}`) — no additional disclosure surface (T-34-02-01 accept disposition holds).

---
*Phase: 34-drafter-info-header*
*Plan: 02*
*Completed: 2026-04-29*
