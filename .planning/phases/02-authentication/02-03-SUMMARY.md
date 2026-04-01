---
phase: 02-authentication
plan: 03
subsystem: auth
tags: [react, i18next, zustand, axios, jwt, tailwindcss, react-router, zod, react-hook-form]

# Dependency graph
requires:
  - phase: 02-01
    provides: Backend JWT auth API (login, refresh, logout endpoints)
provides:
  - i18n infrastructure with Korean/English translations (reusable by all future phases)
  - Zustand auth store with in-memory JWT management
  - Axios JWT interceptor with 401 queue pattern and proactive refresh
  - React Router with ProtectedRoute guard and SplashScreen
  - AuthLayout shared card layout component
  - Login page with form validation, error banners, lockout countdown
  - useAuth hook (login, logout, initAuth)
affects: [02-04, 03-organization, 04-templates, 05-attachments, 06-submission, 07-approval, 08-dashboard]

# Tech tracking
tech-stack:
  added: [react-i18next, i18next, i18next-browser-languagedetector, i18next-http-backend, lucide-react, "@hookform/resolvers"]
  patterns: [i18n namespace pattern (common/auth), Axios 401 queue pattern, Zustand store pattern, ProtectedRoute guard, AuthLayout card wrapper]

key-files:
  created:
    - frontend/src/i18n/config.ts
    - frontend/public/locales/ko/common.json
    - frontend/public/locales/ko/auth.json
    - frontend/public/locales/en/common.json
    - frontend/public/locales/en/auth.json
    - frontend/src/types/auth.ts
    - frontend/src/stores/authStore.ts
    - frontend/src/components/ProtectedRoute.tsx
    - frontend/src/components/SplashScreen.tsx
    - frontend/src/layouts/AuthLayout.tsx
    - frontend/src/features/auth/schemas/loginSchema.ts
    - frontend/src/features/auth/hooks/useAuth.ts
    - frontend/src/features/auth/components/AuthErrorBanner.tsx
    - frontend/src/features/auth/components/LoginForm.tsx
    - frontend/src/features/auth/pages/LoginPage.tsx
  modified:
    - frontend/package.json
    - frontend/src/api/client.ts
    - frontend/src/main.tsx
    - frontend/src/App.tsx
    - frontend/tailwind.config.js

key-decisions:
  - "Zod v4 boolean() without .default(false) to avoid input/output type mismatch with react-hook-form resolver"
  - "@hookform/resolvers added as dependency (supports both zod v3 and v4 transparently)"
  - "Translation files in public/locales/ (loaded by i18next-http-backend at runtime, not bundled)"

patterns-established:
  - "i18n: t('namespace:key.subkey') pattern with common/auth namespaces"
  - "Auth store: useAuthStore.getState() for non-React contexts (interceptors), useAuthStore() hook for components"
  - "API error parsing: AuthError type with credentials/locked/network discriminant"
  - "Form pattern: react-hook-form + zodResolver + i18n error message keys resolved at render time"
  - "Layout pattern: AuthLayout wraps centered card, pages compose content inside"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 5min
completed: 2026-04-01
---

# Phase 02 Plan 03: Frontend Auth Infrastructure Summary

**i18n setup with Korean/English, Zustand JWT store, Axios 401 queue interceptor, React Router guards, and login page with validation, error banners, and lockout countdown**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-01T06:20:29Z
- **Completed:** 2026-04-01T06:25:55Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments
- Complete i18n infrastructure with Korean default and English fallback, reusable for all future phases
- Axios JWT interceptor with queue pattern for concurrent 401s and proactive token refresh within 5-minute window
- Login page matching UI-SPEC: centered card, email auto-focus, password toggle, remember-me, red/amber error banners with live lockout countdown
- React Router with ProtectedRoute (auth check, loading splash, mustChangePassword redirect)

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n infrastructure, Zustand auth store, Axios JWT interceptor, React Router + route guards** - `d5fa7b2` (feat)
2. **Task 2: Login page UI (LoginForm, AuthErrorBanner, lockout UI)** - `0682515` (feat)

## Files Created/Modified
- `frontend/src/i18n/config.ts` - i18next initialization with HttpBackend, LanguageDetector, Korean default
- `frontend/public/locales/ko/auth.json` - Korean auth translations (login, validation, errors, password change, admin)
- `frontend/public/locales/en/auth.json` - English auth translations
- `frontend/public/locales/ko/common.json` - Korean common translations (app name, buttons, network error)
- `frontend/public/locales/en/common.json` - English common translations
- `frontend/src/types/auth.ts` - UserProfile, LoginRequest/Response, RefreshResponse, AuthErrorData types
- `frontend/src/stores/authStore.ts` - Zustand store with in-memory accessToken, user, isAuthenticated, isLoading
- `frontend/src/api/client.ts` - Axios client with request interceptor (JWT + proactive refresh) and response interceptor (401 queue pattern)
- `frontend/src/components/ProtectedRoute.tsx` - Route guard: loading -> splash, unauthed -> /login, mustChangePassword -> /change-password
- `frontend/src/components/SplashScreen.tsx` - Full-viewport centered MiceSign text + spinner
- `frontend/src/layouts/AuthLayout.tsx` - Centered card layout (400px max, rounded-xl shadow-lg, responsive padding)
- `frontend/src/features/auth/schemas/loginSchema.ts` - Zod schema with i18n validation message keys
- `frontend/src/features/auth/hooks/useAuth.ts` - useLogin, useLogout, useInitAuth hooks with error parsing
- `frontend/src/features/auth/components/AuthErrorBanner.tsx` - Red credentials banner + amber lockout banner with live countdown
- `frontend/src/features/auth/components/LoginForm.tsx` - Full login form with react-hook-form, password toggle, spinner, lockout states
- `frontend/src/features/auth/pages/LoginPage.tsx` - Login page composing AuthLayout + branding + LoginForm
- `frontend/src/main.tsx` - Added i18n init, QueryClientProvider, BrowserRouter, Suspense wrappers
- `frontend/src/App.tsx` - React Router routes + silent refresh on mount
- `frontend/tailwind.config.js` - Added darkMode: 'media'
- `frontend/package.json` - Added react-i18next, i18next, lucide-react, @hookform/resolvers

## Decisions Made
- Used `z.boolean()` instead of `z.boolean().default(false)` for rememberMe to avoid zod v4 input/output type incompatibility with react-hook-form resolver (set default in useForm instead)
- Added `@hookform/resolvers` package (not in original plan but required for zodResolver integration)
- Translation files placed in `public/locales/` not `src/i18n/locales/` per plan spec (i18next-http-backend loads from public at runtime)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @hookform/resolvers dependency**
- **Found during:** Task 1 (dependency installation)
- **Issue:** Plan listed react-hook-form and zod but not @hookform/resolvers, which is required for zodResolver
- **Fix:** Added `@hookform/resolvers` to npm install command
- **Files modified:** frontend/package.json, frontend/package-lock.json
- **Verification:** Build passes, zodResolver imports correctly
- **Committed in:** d5fa7b2 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed zod v4 .default() type incompatibility with react-hook-form**
- **Found during:** Task 2 (LoginForm build)
- **Issue:** `z.boolean().default(false)` in zod v4 makes the input type `boolean | undefined`, incompatible with react-hook-form's resolver type expectations
- **Fix:** Changed to `z.boolean()` and set defaultValues in useForm config instead
- **Files modified:** frontend/src/features/auth/schemas/loginSchema.ts
- **Verification:** TypeScript build passes with no errors
- **Committed in:** 0682515 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for build success. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Known Stubs
- `DashboardPlaceholder` in App.tsx renders "Dashboard (coming soon)" text -- intentional placeholder, will be replaced by Phase 08 dashboard implementation
- `/change-password` route not yet defined -- will be added by Plan 04 (password change)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Frontend auth infrastructure complete, ready for Plan 04 (password change page)
- i18n namespaces and translation patterns established for all future phases
- Axios interceptor wired to backend auth API from Plan 01
- AuthLayout and form patterns reusable for password change page

## Self-Check: PASSED

All 13 created files verified present. Both task commits (d5fa7b2, 0682515) verified in git log.

---
*Phase: 02-authentication*
*Completed: 2026-04-01*
