# Phase 2: Authentication - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 02-authentication
**Areas discussed:** Login UI & Flow, Token Refresh Strategy, Password Management UX, Account Lockout UX

---

## Login UI & Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Centered card | Clean centered form card on minimal background | ✓ |
| Split layout | Left side branding, right side form | |
| Full-screen form | Form takes up full viewport | |

**User's choice:** Centered card
**Notes:** Standard for internal tools, fast to build

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline below fields | Validation errors under each field, auth errors as banner above form | ✓ |
| Toast notification | Errors pop up as temporary toast messages | |

**User's choice:** Inline below fields
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| No checkbox | Always use 14-day refresh token | |
| Yes, with shorter default | Unchecked = session cookie, checked = 14-day | ✓ |

**User's choice:** Remember me checkbox with session/14-day behavior
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard | Redirect to main dashboard page | ✓ |
| Original URL | Redirect to the page user was trying to access | |

**User's choice:** Dashboard
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 한국어 only | All labels, placeholders, errors in Korean | |
| Bilingual (KR/EN) | Korean primary with English fallback | ✓ |

**User's choice:** Bilingual (KR/EN)
**Notes:** Broader scope than expected — requires i18n infrastructure

---

| Option | Description | Selected |
|--------|-------------|----------|
| Browser locale auto-detect | Detect browser language, default to Korean | ✓ |
| Manual toggle on login page | KR/EN toggle button on login page | |
| User profile setting | Language set per-user account | |

**User's choice:** Browser locale auto-detect
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Entire app | Set up i18n infrastructure for all phases | ✓ |
| Login page only | Only login/auth pages are bilingual | |

**User's choice:** Entire app
**Notes:** react-i18next selected as library

---

| Option | Description | Selected |
|--------|-------------|----------|
| react-i18next | Most popular React i18n solution | ✓ |
| react-intl (FormatJS) | ICU MessageFormat standard | |

**User's choice:** react-i18next
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Disable button + spinner | Button shows spinner and becomes disabled | ✓ |
| Full-page loading overlay | Overlay covers the form | |

**User's choice:** Disable button + spinner
**Notes:** Prevents double-submit

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-focus email | Cursor starts in email field | ✓ |
| No auto-focus | User clicks to focus | |

**User's choice:** Yes, auto-focus email
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| On blur + on submit | Validate each field when user leaves it + on submit | ✓ |
| On submit only | All errors shown after clicking login | |

**User's choice:** On blur + on submit
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| System preference | Follow OS dark/light setting | ✓ |
| Light mode only | Always light theme | |
| Toggle on login page | Dark/light toggle visible | |

**User's choice:** System preference
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, Enter submits | Standard HTML form behavior | ✓ |
| Tab through fields first | Enter only from focused button | |

**User's choice:** Yes, Enter submits
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, eye icon toggle | Click to show/hide password | ✓ |
| No toggle | Password always masked | |

**User's choice:** Yes, eye icon toggle
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| MiceSign logo + app name | Logo and text at top of card | ✓ |
| Company name + MiceSign | Company name primary, MiceSign subtitle | |

**User's choice:** MiceSign logo + app name
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 로그인 상태 유지 | Standard Korean label | ✓ |
| 자동 로그인 | Shorter but could imply different behavior | |

**User's choice:** 로그인 상태 유지
**Notes:** None

---

## Token Refresh Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Queue pattern | First 401 triggers refresh, subsequent 401s queue and replay | ✓ |
| Mutex/lock pattern | Lock prevents concurrent refresh attempts | |

**User's choice:** Queue pattern
**Notes:** Addresses STATE.md concern about concurrent 401s

---

| Option | Description | Selected |
|--------|-------------|----------|
| Proactive | Refresh when <5min remaining | ✓ |
| Reactive only | Only refresh when 401 received | |

**User's choice:** Proactive (5 min threshold)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Silent redirect to login | Clear state, redirect with no error modal | ✓ |
| Error message then redirect | Show session expired message briefly | |

**User's choice:** Silent redirect to login
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-refresh on init | Call /refresh silently on bootstrap | ✓ |

**User's choice:** Yes, auto-refresh on init
**Notes:** AUTH-05 requirement

---

| Option | Description | Selected |
|--------|-------------|----------|
| Zustand in-memory only | Store in RAM, no localStorage | ✓ |
| Zustand + sessionStorage | Also persist to sessionStorage | |

**User's choice:** Zustand in-memory only
**Notes:** Most secure — restored via cookie refresh

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include user info | Refresh response includes user profile | ✓ |
| Token only, separate /me call | Fetch user info separately | |

**User's choice:** Yes, include user info
**Notes:** Avoids extra API call after refresh

---

| Option | Description | Selected |
|--------|-------------|----------|
| Database | Store in refresh_token table | ✓ |
| Stateless (signed JWT) | No DB storage | |

**User's choice:** Database
**Notes:** Enables revocation, rotation tracking, multi-device

---

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate invalidation | Old token invalid immediately | ✓ |
| Short grace period (~10s) | Old token valid briefly | |

**User's choice:** Immediate invalidation
**Notes:** Most secure against replay attacks

---

| Option | Description | Selected |
|--------|-------------|----------|
| Current session only | Only invalidate current cookie's token | ✓ |
| All sessions | Logs out everywhere | |
| Both options available | Normal + "logout all" button | |

**User's choice:** Current session only
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| jjwt 0.12.x | Most popular Java JWT library | ✓ |
| Spring Security OAuth2 Resource Server | Built into Spring Security | |

**User's choice:** jjwt 0.12.x
**Notes:** Per CLAUDE.md recommendation

---

| Option | Description | Selected |
|--------|-------------|----------|
| Standard + role + dept | sub, email, name, role, departmentId, iat, exp | ✓ |
| Minimal (sub + role only) | Just userId and role | |

**User's choice:** Standard + role + dept
**Notes:** Enough for @PreAuthorize without DB lookup

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, brief splash/spinner | Loading indicator while /refresh is called | ✓ |
| No splash, instant render | Render login immediately | |

**User's choice:** Yes, brief splash/spinner
**Notes:** Prevents flash of login page for authenticated users

---

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple sessions allowed | User can be on desktop, phone, etc. | ✓ |
| Single session only | New login invalidates previous | |

**User's choice:** Multiple sessions allowed
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 5 minutes before expiry | Refresh when <5min remaining with 30min TTL | ✓ |
| 2 minutes before expiry | Tighter window | |

**User's choice:** 5 minutes before expiry
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| HMAC-SHA256 | Symmetric key, simpler | ✓ |
| RSA-256 | Asymmetric key pair | |

**User's choice:** HMAC-SHA256
**Notes:** Sufficient for single-server architecture

---

| Option | Description | Selected |
|--------|-------------|----------|
| application.yml property | In Spring config, overridable by profile | ✓ |
| Environment variable | JWT_SECRET in .env | |

**User's choice:** application.yml property
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 401 for auth, 403 for role | Standard HTTP convention | ✓ |

**User's choice:** 401 for auth, 403 for role
**Notes:** None

---

## Password Management UX

| Option | Description | Selected |
|--------|-------------|----------|
| Profile/settings page | Dedicated settings page | ✓ |
| Modal from header menu | Dropdown opens modal | |
| Both | Full page + shortcut | |

**User's choice:** Profile/settings page
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 8+ chars, mixed types | Min 8 chars, at least 2 of: upper/lower/number/special | ✓ |
| 12+ chars, strict | Min 12 chars, all 4 types | |

**User's choice:** 8+ chars, mixed types
**Notes:** Standard for internal tools

---

| Option | Description | Selected |
|--------|-------------|----------|
| Admin sets temporary password | Admin enters temp PW, user forced to change on next login | ✓ |
| Auto-generate and display | System generates random temp password | |

**User's choice:** Admin sets temporary password
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, force change | Redirect to change password page before app access | ✓ |
| No, optional | User can keep initial password | |

**User's choice:** Yes, force change
**Notes:** Applies to first login AND after admin reset

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, strength bar + checklist | Colored bar + requirement checklist as user types | ✓ |
| Checklist only | Just requirement checklist | |
| No indicators | Validate on submit only | |

**User's choice:** Yes, strength bar + checklist
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| No history check | Users can reuse old passwords | ✓ |
| Block last 3 passwords | Store hashed history | |

**User's choice:** No history check
**Notes:** Simpler for ~50 users

---

| Option | Description | Selected |
|--------|-------------|----------|
| Invalidate all other sessions | Revoke all refresh tokens except current | ✓ |
| Keep all sessions active | No effect on existing sessions | |

**User's choice:** Invalidate all other sessions
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Password change only | Phase 2 profile page is minimal | ✓ |
| Read-only profile + password change | Show user info alongside | |

**User's choice:** Password change only
**Notes:** User info display comes in Phase 3

---

| Option | Description | Selected |
|--------|-------------|----------|
| Success toast + stay on page | Show message, stay on profile | |
| Success message + redirect to dashboard | Show success, redirect | ✓ |

**User's choice:** Success message + redirect to dashboard
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, always force after reset | Admin reset marks must-change-password | ✓ |
| Only on first-ever login | Force change only for new accounts | |

**User's choice:** Yes, always force after reset
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, require current password | Current PW + new PW + confirm | ✓ |
| No current password needed | Just new PW + confirm | |

**User's choice:** Yes, require current password
**Notes:** Standard security practice

---

| Option | Description | Selected |
|--------|-------------|----------|
| Admin reset only | No self-service recovery | ✓ |
| Email recovery link | Self-service via email | |

**User's choice:** Admin reset only
**Notes:** Avoids SMTP dependency (deferred to Phase 1-B)

---

## Account Lockout UX

| Option | Description | Selected |
|--------|-------------|----------|
| Message with remaining time | Shows countdown so user knows when to retry | ✓ |
| Generic lockout message | No countdown (more secure) | |

**User's choice:** Message with remaining time
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show remaining attempts | After failures: "로그인 실패. N회 남았습니다." | ✓ |
| No, generic error only | Always same error message | |
| Show after 3rd attempt | Generic first, then show count | |

**User's choice:** Yes, show remaining attempts
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, admin can unlock | Admin sees locked status, can unlock | ✓ |
| No, timer only | Only 15-minute auto-unlock | |

**User's choice:** Yes, admin can unlock
**Notes:** Useful for ~50 employee context

---

| Option | Description | Selected |
|--------|-------------|----------|
| Reset on successful login | Counter goes to 0 after success + after lockout expires | ✓ |
| Reset only after 15-min window | Counter persists across periods | |

**User's choice:** Reset on successful login
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Disable button + countdown | Live countdown, button disabled | ✓ |
| Message only, button stays enabled | Show message, keep button clickable | |

**User's choice:** Disable button + countdown
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, log lockout events | Record in audit_log table | ✓ |
| No, just functional | No audit trail until Phase 8 | |

**User's choice:** Yes, log lockout events
**Notes:** Aligns with AUD-01 prep

---

| Option | Description | Selected |
|--------|-------------|----------|
| Per-account only | Track by user account | ✓ |
| Per-account + per-IP | Track both dimensions | |

**User's choice:** Per-account only
**Notes:** Sufficient for internal system

---

| Option | Description | Selected |
|--------|-------------|----------|
| Database (user table fields) | failed_login_count and locked_until columns | ✓ |
| In-memory (ConcurrentHashMap) | Faster but lost on restart | |

**User's choice:** Database (user table fields)
**Notes:** Persists across server restarts

---

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct messages | Different text and colors/icons for wrong creds vs locked | ✓ |
| Same error style, different text | Same red banner, just different text | |

**User's choice:** Distinct messages
**Notes:** None

---

## Claude's Discretion

- Exact Tailwind styling and color palette for login card
- Splash/loading spinner component design
- i18n namespace organization and file structure
- Exact JWT token expiry buffer calculation logic
- Axios interceptor internal implementation details
- Zustand auth store structure
- Profile/settings page layout details
- React Router route guard implementation approach
- Backend security filter chain ordering

## Deferred Ideas

- Self-service "forgot password" via email link — requires SMTP (Phase 1-B)
- "Logout all devices" button — Phase 3 or later
- Login attempt rate limiting by IP — not needed for internal system
- OAuth/SSO integration — explicitly out of scope
