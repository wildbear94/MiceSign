# Phase 2: Authentication - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely log in with email/password, maintain sessions across browser refreshes via automatic token refresh, log out, and manage their passwords. Accounts lock after repeated failed login attempts. This phase replaces the Phase 1 permit-all SecurityConfig with full JWT-based stateless authentication.

Requirements covered: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07

</domain>

<decisions>
## Implementation Decisions

### Login UI & Flow
- **D-01:** Centered card layout on minimal background with MiceSign logo + app name at top
- **D-02:** "Remember me" checkbox — unchecked = session cookie (expires on browser close), checked = 14-day refresh token. Label: "로그인 상태 유지"
- **D-03:** Bilingual UI (Korean/English) using react-i18next with browser locale auto-detect. Korean default when ambiguous. Entire app scope — i18n infrastructure set up in Phase 2 for all future phases
- **D-04:** Inline validation errors below each field, auth errors (wrong password, lockout) as banner above form. Validation triggers on blur + on submit
- **D-05:** Email field auto-focus on page load, Enter key submits from any field
- **D-06:** Password visibility toggle (eye icon)
- **D-07:** Login button disables with spinner during API call (prevents double-submit)
- **D-08:** System dark/light theme preference (follows OS setting, no manual toggle on login page)
- **D-09:** After successful login, redirect to dashboard page
- **D-10:** Error display — inline below fields for validation, banner above form for auth errors (wrong credentials, account locked)

### Token Refresh Strategy
- **D-11:** Axios interceptor uses queue pattern for concurrent 401s — first 401 triggers refresh, subsequent requests queue and replay with new token after refresh succeeds
- **D-12:** Proactive token refresh — check token expiry before requests, refresh when <5 minutes remaining (with 30min access token TTL)
- **D-13:** Access token stored in Zustand in-memory only (RAM) — lost on page refresh, restored via cookie-based refresh
- **D-14:** On app init (browser refresh), call /api/v1/auth/refresh silently. Show brief splash/spinner while checking auth. If cookie valid, restore session; if not, show login page (AUTH-05)
- **D-15:** Refresh endpoint returns user profile data (user ID, name, email, role, departmentId) alongside new access token — avoids separate /me call
- **D-16:** When refresh token is expired or rotation fails, silently clear Zustand auth state and redirect to /login (no error modal)
- **D-17:** Refresh tokens stored in database (refresh_token table from PRD schema) — enables revocation, rotation tracking, multi-device management
- **D-18:** Immediate invalidation on token rotation — old refresh token invalid as soon as new one is issued
- **D-19:** JWT library: jjwt 0.12.x (as recommended in CLAUDE.md)
- **D-20:** JWT signing: HMAC-SHA256 (symmetric key) — sufficient for single-server architecture
- **D-21:** JWT secret configured in application.yml (overridable by Spring profile per environment)
- **D-22:** JWT claims: sub (userId), email, name, role, departmentId, iat, exp — enough for @PreAuthorize checks without DB lookup
- **D-23:** Multiple active sessions (devices) per user allowed — each has its own refresh token
- **D-24:** Logout invalidates current session's refresh token only (other devices stay logged in)
- **D-25:** HTTP error codes: 401 Unauthorized for missing/expired token (triggers refresh), 403 Forbidden for insufficient role (no retry, show access denied)

### Password Management
- **D-26:** Password change lives on a dedicated profile/settings page — Phase 2 scope is password change only (no other profile info display)
- **D-27:** Password rules: minimum 8 characters, must include at least 2 of: uppercase, lowercase, number, special character
- **D-28:** Real-time password strength bar (weak/medium/strong) + checklist of requirements shown as user types
- **D-29:** Admin password reset: admin enters a temporary password on user management page. User must change it on next login
- **D-30:** Force password change on first login (new account) AND after admin password reset — redirect to change password page before allowing app access
- **D-31:** Password change form requires current password + new password + confirm new password
- **D-32:** After password change, invalidate all other sessions (refresh tokens) except current. User stays logged in, other devices logged out
- **D-33:** No password history check — users can reuse old passwords
- **D-34:** No self-service "forgot password" flow — admin reset is the only recovery path (avoids SMTP dependency, deferred to Phase 1-B)
- **D-35:** Success after password change: show success message "비밀번호가 변경되었습니다" then redirect to dashboard

### Account Lockout
- **D-36:** Lockout message with remaining time: "계정이 잠겼습니다. MM:SS 후 다시 시도해주세요." — shows live countdown
- **D-37:** Show remaining login attempts after each failure: "로그인 실패. N회 남았습니다."
- **D-38:** Admin can manually unlock a locked account from user management page
- **D-39:** Failed attempt counter resets on successful login. Also resets after 15-minute lockout expires
- **D-40:** Login button disabled with live countdown timer during lockout period
- **D-41:** Lockout events logged to audit_log table for security auditing (aligns with AUD-01 prep)
- **D-42:** Lockout tracked per-account only (not per-IP) — sufficient for internal system
- **D-43:** Failed attempt count and lockout timestamp stored in user table (DB columns: failed_login_count, locked_until)
- **D-44:** Distinct visual treatment for wrong credentials vs locked account — different message text and colors/icons

### Claude's Discretion
- Exact Tailwind styling and color palette for login card
- Splash/loading spinner component design
- i18n namespace organization and file structure
- Exact JWT token expiry buffer calculation logic
- Axios interceptor internal implementation details
- Zustand auth store structure
- Profile/settings page layout details
- React Router route guard implementation approach
- Backend security filter chain ordering

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements & Specs
- `docs/PRD_MiceSign_v2.0.md` — Full PRD with DB schema DDL (refresh_token table, user table with lockout fields), JWT architecture, auth flow description
- `docs/FSD_MiceSign_v1.0.md` — Functional spec with auth API contracts, error codes (AUTH_001-AUTH_007), business rules for login/logout/lockout

### Project Planning
- `.planning/ROADMAP.md` — Phase 2 success criteria, dependency on Phase 1
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-07 requirement definitions
- `CLAUDE.md` — Tech stack validation, jjwt 0.12.x recommendation, Axios interceptor concern, JWT architecture decisions

### Existing Code (Phase 1 Foundation)
- `backend/src/main/java/com/micesign/config/SecurityConfig.java` — Current permit-all config to be replaced with JWT filter chain
- `frontend/src/api/client.ts` — Axios client with placeholder for JWT refresh interceptor
- `backend/build.gradle.kts` — Current dependencies (Spring Security already included, jjwt to be added)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SecurityConfig.java` — Has BCryptPasswordEncoder bean already configured; needs JWT filter chain added
- `apiClient` (client.ts) — Axios instance with `/api/v1` baseURL and envelope response interceptor; ready for JWT interceptor addition
- `frontend/src/features/auth/` — Empty directory created in Phase 1, ready for auth components
- `frontend/src/stores/` — Empty stores directory ready for Zustand auth store

### Established Patterns
- API envelope: `{"success": true, "data": {...}, "error": null}` — auth endpoints must follow this
- API prefix: `/api/v1` — auth routes at `/api/v1/auth/*`
- Layer-first backend: `com.micesign.controller`, `.service`, `.repository`, `.domain`, `.config`, `.security`
- Feature-folder frontend: `src/features/auth/` for auth components
- Flyway migrations for schema changes (add lockout columns, refresh_token table if not already in V1)
- H2 MariaDB mode for integration tests

### Integration Points
- SecurityConfig needs JWT filter added before UsernamePasswordAuthenticationFilter
- Axios client needs request interceptor (attach Bearer token) and response interceptor (401 queue + refresh)
- Zustand store needs auth state (accessToken, user, isAuthenticated, isLoading)
- React Router needs auth guard/protected route wrapper
- Login page is the unauthenticated entry point; all other routes require auth
- Profile/settings page connects to authenticated layout (header with user menu)

</code_context>

<specifics>
## Specific Ideas

- Bilingual (KR/EN) UI is a cross-cutting decision — react-i18next infrastructure must be set up as foundation for ALL future phases, not just auth pages
- "Remember me" checkbox behavior: unchecked uses session cookie (browser close = logout), checked uses 14-day persistent cookie
- Force password change redirects to a dedicated change-password page that blocks navigation to other routes until completed
- Live countdown timer on lockout is client-side based on locked_until timestamp from server response
- Admin unlock and admin password reset will be minimal UI (likely on a user list/detail page) — full admin UI comes in Phase 3

</specifics>

<deferred>
## Deferred Ideas

- Self-service "forgot password" via email link — requires SMTP (Phase 1-B scope)
- "Logout all devices" button in user settings — could be Phase 3 or later
- Login attempt rate limiting by IP — not needed for internal system, but could be added later
- OAuth/SSO integration — explicitly out of scope per REQUIREMENTS.md

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-04-01*
