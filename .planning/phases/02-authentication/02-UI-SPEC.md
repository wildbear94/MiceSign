---
status: draft
phase: 02
phase_name: Authentication
design_system: manual (TailwindCSS 3.4 + Pretendard)
created: 2026-04-01
---

# Phase 2: Authentication - UI Design Contract

## Overview

This contract defines the visual and interaction specifications for the authentication phase: login page, splash/loading screen, password change page, auth error banner, and lockout UI. All measurements, colors, and copy are prescriptive. Implementors should not deviate without updating this contract.

## Design System State

| Property | Value |
|----------|-------|
| Tool | None (manual TailwindCSS) |
| CSS Framework | TailwindCSS 3.4 |
| Component Library | None (custom components) |
| Icon Library | lucide-react |
| Font | Pretendard Variable (already configured in tailwind.config.js) |
| Theme | OS preference via `prefers-color-scheme` (D-08) |
| i18n | react-i18next, Korean default, browser locale auto-detect (D-03) |

No shadcn. No third-party component registry.

## Spacing

8-point grid. All spacing values must be multiples of 4px from the standard set: 4, 8, 16, 24, 32, 48, 64.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px (`p-1`) | Icon padding, inline gaps, label-to-input gap |
| `space-2` | 8px (`p-2`) | Between icon and text, password strength bar to checklist gap |
| `space-4` | 16px (`p-4`) | Between form fields, card internal padding (mobile), horizontal margin on mobile |
| `space-6` | 24px (`p-6`) | Card internal padding (desktop), section gaps |
| `space-8` | 32px (`p-8`) | Between card sections (logo area to form area) |
| `space-12` | 48px (`p-12`) | Card outer padding on large screens |

**Exceptions:**
- Touch targets for interactive elements (buttons, checkboxes, password toggle) must be at minimum 44px x 44px for accessibility. This is a size constraint, not a spacing token.
- Input horizontal padding uses 16px (`px-4`) from the standard set.

## Typography

Pretendard Variable is the sole font family. Four sizes, two weights.

| Role | Size | Weight | Line Height | Tailwind Class |
|------|------|--------|-------------|----------------|
| Page title / Logo text | 24px | 600 (semibold) | 1.2 | `text-2xl font-semibold leading-tight` |
| Section heading | 18px | 600 (semibold) | 1.3 | `text-lg font-semibold leading-snug` |
| Body / Input text / Button text | 16px | 400 (regular) | 1.5 | `text-base font-normal leading-normal` |
| Caption / Helper / Labels / Strength labels / Checklist | 14px | 400 (regular) | 1.5 | `text-sm font-normal leading-normal` |

**Label text:** 14px, weight 600 (semibold), `text-sm font-semibold`. Labels use semibold to visually distinguish them from helper text at the same size.

**Button text exception:** Login and submit buttons use 16px weight 600 (`text-base font-semibold`) for emphasis. This uses the two declared weights (400, 600) only.

## Color

### Light Mode (default)

60/30/10 split.

| Role | Percentage | Color | Tailwind | Usage |
|------|-----------|-------|----------|-------|
| Dominant surface | 60% | `#F9FAFB` | `bg-gray-50` | Page background |
| Secondary surface | 30% | `#FFFFFF` | `bg-white` | Login card, input backgrounds |
| Accent (primary) | 10% | `#2563EB` | `bg-blue-600` | Login button, primary links, focus rings |

**Accent reserved for:** Login/submit buttons, primary action links, focus ring on inputs, password strength "strong" indicator, active state highlights.

| Semantic | Color | Tailwind | Usage |
|----------|-------|----------|-------|
| Accent hover | `#1D4ED8` | `bg-blue-700` | Button hover state |
| Accent disabled | `#93C5FD` | `bg-blue-300` | Button disabled state |
| Error | `#DC2626` | `text-red-600` | Validation errors, error banners, lockout messages |
| Error background | `#FEF2F2` | `bg-red-50` | Error banner background |
| Error border | `#FECACA` | `border-red-200` | Error banner border |
| Warning | `#D97706` | `text-amber-600` | Remaining attempts warning |
| Warning background | `#FFFBEB` | `bg-amber-50` | Warning banner background |
| Warning border | `#FDE68A` | `border-amber-200` | Warning banner border |
| Success | `#16A34A` | `text-green-600` | Password strength "strong", success messages |
| Success background | `#F0FDF4` | `bg-green-50` | Success banner background |
| Text primary | `#111827` | `text-gray-900` | Headings, input text |
| Text secondary | `#6B7280` | `text-gray-500` | Placeholder text, helper text, captions |
| Text tertiary | `#9CA3AF` | `text-gray-400` | Disabled text |
| Border default | `#D1D5DB` | `border-gray-300` | Input borders |
| Border focus | `#2563EB` | `ring-blue-600` | Input focus ring |

### Dark Mode

Follows OS `prefers-color-scheme: dark`. Use Tailwind `dark:` prefix.

| Role | Color | Tailwind |
|------|-------|----------|
| Dominant surface | `#111827` | `dark:bg-gray-900` |
| Secondary surface | `#1F2937` | `dark:bg-gray-800` |
| Card surface | `#374151` | `dark:bg-gray-700` |
| Text primary | `#F9FAFB` | `dark:text-gray-50` |
| Text secondary | `#9CA3AF` | `dark:text-gray-400` |
| Border default | `#4B5563` | `dark:border-gray-600` |
| Accent | `#3B82F6` | `dark:bg-blue-500` |
| Error | `#EF4444` | `dark:text-red-400` |
| Error background | `#7F1D1D20` | `dark:bg-red-900/20` |

**Tailwind dark mode config:** Add `darkMode: 'media'` to tailwind.config.js (uses OS preference, no toggle needed per D-08).

## Component Inventory

### 1. Login Page (`LoginPage.tsx`)

**Layout:** Full viewport height. Centered card on dominant surface background.

**Primary visual anchor:** Full-width login button (blue `bg-blue-600`, high contrast against white card, positioned at the bottom of the form) serves as the focal point of the login page. The blue accent against the neutral card creates the strongest contrast point, drawing the user's eye to the primary action.

```
+--------------------------------------------------+
|                  bg-gray-50                        |
|                                                    |
|         +----------------------------+             |
|         |     [MiceSign Logo]        |             |
|         |     MiceSign               |             |
|         |     전자 결재 시스템         |             |
|         |                            |             |
|         |  이메일                     |             |
|         |  [_____________________]   |             |
|         |  (inline error)            |             |
|         |                            |             |
|         |  비밀번호              [eye]|             |
|         |  [_____________________]   |             |
|         |  (inline error)            |             |
|         |                            |             |
|         |  [x] 로그인 상태 유지       |             |
|         |                            |             |
|         |  (auth error banner)       |             |
|         |                            |             |
|         |  [      로그인      ]      |             |
|         +----------------------------+             |
|                                                    |
+--------------------------------------------------+
```

**Card specs:**
- Max width: 400px (`max-w-[400px]`)
- Width: 100% with 16px horizontal margin on mobile (`w-full mx-4`)
- Padding: 48px on desktop (`p-12`), 24px on mobile (`p-6`)
- Background: white (`bg-white dark:bg-gray-800`)
- Border radius: 12px (`rounded-xl`)
- Shadow: `shadow-lg` (0 10px 15px rgba(0,0,0,0.1))
- Border: 1px gray-200 (`border border-gray-200 dark:border-gray-700`)

**Logo area:**
- MiceSign text: 24px semibold, centered
- Subtitle "전자 결재 시스템": 14px, text-gray-500, centered, 4px below title
- Gap between logo area and form: 32px

### 2. Login Form (`LoginForm.tsx`)

**Input fields:**
- Height: 44px (`h-11`)
- Padding: 16px horizontal (`px-4`)
- Font: 16px regular (prevents iOS zoom)
- Border: 1px `border-gray-300`, radius 8px (`rounded-lg`)
- Focus: 2px ring `ring-blue-600`, border transparent
- Error state: border `border-red-500`, ring `ring-red-500`
- Placeholder color: `text-gray-400`
- Gap between label and input: 4px
- Gap between fields: 16px

**Labels:**
- Font: 14px, weight 600 (`text-sm font-semibold`)
- Color: `text-gray-700 dark:text-gray-300`

**Email field:**
- `type="email"`, `autoFocus` (D-05)
- `autoComplete="email"`
- Placeholder: "name@company.com"

**Password field:**
- `type="password"` (toggleable to `type="text"`)
- `autoComplete="current-password"`
- Placeholder: none (empty)
- Visibility toggle: `Eye` / `EyeOff` icon from lucide-react, 20px, positioned absolute right inside input, `text-gray-400 hover:text-gray-600`, 44px touch target

**Remember me checkbox (D-02):**
- Native checkbox with Tailwind styling, 16px x 16px
- Label: "로그인 상태 유지" / "Keep me signed in"
- Font: 14px regular, `text-gray-600`
- Gap between checkbox and label: 8px
- Margin top from last field: 16px

**Login button:**
- Full width (`w-full`)
- Height: 44px (`h-11`)
- Font: 16px, weight 600 (`text-base font-semibold`)
- Background: `bg-blue-600 hover:bg-blue-700`
- Text: white
- Border radius: 8px (`rounded-lg`)
- Disabled state: `bg-blue-300 cursor-not-allowed` (D-07)
- Loading state: spinner icon (16px, white, `animate-spin`) replaces button text. Button text during loading: "로그인 중..." / "Signing in..."
- Margin top from remember-me: 24px
- Transition: `transition-colors duration-150`

**Enter key:** Submits form from any field (D-05). Use `<form onSubmit>`.

### 3. Auth Error Banner (`AuthErrorBanner.tsx`)

Positioned between the remember-me checkbox and the login button.

**Wrong credentials (D-44):**
- Background: `bg-red-50 dark:bg-red-900/20`
- Border: 1px `border-red-200 dark:border-red-800`
- Border radius: 8px
- Padding: 16px (`p-4`)
- Icon: `AlertCircle` from lucide-react, 16px, `text-red-600`
- Text: 14px, `text-red-700 dark:text-red-400`
- Message: "이메일 또는 비밀번호가 올바르지 않습니다. N회 남았습니다." / "Incorrect email or password. N attempts remaining."
- Animation: fade in from top, 200ms ease-out

**Account locked (D-36, D-40, D-44):**
- Background: `bg-amber-50 dark:bg-amber-900/20`
- Border: 1px `border-amber-200 dark:border-amber-800`
- Border radius: 8px
- Padding: 16px (`p-4`)
- Icon: `Lock` from lucide-react, 16px, `text-amber-600`
- Text: 14px, `text-amber-700 dark:text-amber-400`
- Message: "계정이 잠겼습니다. MM:SS 후 다시 시도해주세요." / "Account is locked. Try again in MM:SS."
- Countdown: Live countdown timer updated every second (client-side, D-36). When countdown reaches 0, banner dismisses and login button re-enables.
- Login button during lockout: disabled with `bg-gray-300 text-gray-500` and countdown text as button label: "MM:SS"

### 4. Inline Validation Errors

- Position: directly below the input field, 4px gap
- Font: 14px regular, `text-red-600 dark:text-red-400`
- Icon: none (text only)
- Animation: fade in, 150ms

**Validation messages (triggered on blur + submit, D-04):**
- Email empty: "이메일을 입력해주세요." / "Please enter your email."
- Email invalid format: "올바른 이메일 형식이 아닙니다." / "Please enter a valid email address."
- Password empty: "비밀번호를 입력해주세요." / "Please enter your password."

### 5. Splash Screen (`SplashScreen.tsx`)

Shown during app init auth check (D-14).

- Full viewport, dominant surface background
- Centered: MiceSign logo text (24px semibold) + spinner below
- Spinner: 32px, `border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`
- Gap between logo and spinner: 24px
- Duration: visible until auth check resolves (success or failure)

### 6. Password Change Page (`ChangePasswordPage.tsx`)

**Layout:** Same centered card layout as login page (reuse `AuthLayout.tsx`).

**Card heading:** "비밀번호 변경" / "Change Password", 18px semibold

**Force change notice (D-30):**
- Shown when user is forced to change password (first login / admin reset)
- Background: `bg-blue-50 dark:bg-blue-900/20`
- Border: 1px `border-blue-200`
- Text: 14px, `text-blue-700`
- Message: "보안을 위해 비밀번호를 변경해주세요." / "Please change your password for security."
- Padding: 16px (`p-4`), border radius 8px
- Position: above the form fields, 16px gap below

**Form fields (D-31):**
1. Current password: label "현재 비밀번호" / "Current Password"
2. New password: label "새 비밀번호" / "New Password"
3. Confirm new password: label "비밀번호 확인" / "Confirm Password"

All fields: same input specs as login form. All have password visibility toggles.

**Password strength bar (D-28):**
- Position: directly below "New Password" field, 8px gap
- Height: 4px, full width, border radius 2px
- Background track: `bg-gray-200`
- Three segments concept rendered as a single bar with width progression:
  - Weak (< 33%): `bg-red-500`, width 33%
  - Medium (33-66%): `bg-amber-500`, width 66%
  - Strong (> 66%): `bg-green-500`, width 100%
- Label below bar: "약함" / "Weak", "보통" / "Medium", "강함" / "Strong" — 14px (`text-sm`), matching color
- Transition: width + color, 300ms ease

**Password requirements checklist (D-28):**
- Position: below strength bar, 8px gap
- List of requirements, each with check/x icon (14px, using lucide-react `Check` / `X` at `w-3.5 h-3.5`):
  - "8자 이상" / "At least 8 characters"
  - "대문자 포함" / "Contains uppercase"
  - "소문자 포함" / "Contains lowercase"
  - "숫자 포함" / "Contains number"
  - "특수문자 포함" / "Contains special character"
- Font: 14px (`text-sm`) regular
- Met requirement: `text-green-600`, `Check` icon
- Unmet requirement: `text-gray-400`, `X` icon
- Note: D-27 requires 2 of 4 categories. Show all 5 items but the submit validation passes when 8+ chars AND 2+ of {uppercase, lowercase, number, special} are satisfied.

**Validation messages:**
- Current password wrong: "현재 비밀번호가 올바르지 않습니다." / "Current password is incorrect."
- New password does not meet rules: "비밀번호 조건을 충족하지 않습니다." / "Password does not meet requirements."
- Confirm mismatch: "비밀번호가 일치하지 않습니다." / "Passwords do not match."

**Submit button:**
- Text: "비밀번호 변경" / "Change Password"
- Same style as login button
- Loading text: "변경 중..." / "Changing..."

**Success flow (D-35):**
- On success, show inline success banner (green): "비밀번호가 변경되었습니다." / "Password has been changed."
- After 1.5 seconds, redirect to dashboard

### 7. Auth Layout (`AuthLayout.tsx`)

Shared layout wrapper for login and password change pages.

- `min-h-screen` with `bg-gray-50 dark:bg-gray-900`
- Flexbox centered both axes: `flex items-center justify-center`
- Inner container: `w-full max-w-[400px] mx-4`
- Contains the card with standard padding/border/shadow defined above

### 8. Protected Route (`ProtectedRoute.tsx`)

No visual component. Logic-only wrapper:
- If `isLoading`: render `SplashScreen`
- If `!isAuthenticated`: redirect to `/login`
- If `isAuthenticated && mustChangePassword`: redirect to `/change-password`
- Otherwise: render children

### 9. Admin Password Reset (Minimal, D-29)

Minimal UI on the user management page (full admin UI in Phase 3). Phase 2 scope is the API endpoint and a simple form:

- Modal or inline section with single field: "임시 비밀번호" / "Temporary Password"
- Same password input specs (with visibility toggle)
- Submit button: "비밀번호 초기화" / "Reset Password"
- Confirmation dialog before submit: "이 사용자의 비밀번호를 초기화하시겠습니까?" / "Reset this user's password?"
- Success message: "{username}님의 비밀번호가 초기화되었습니다." / "{username}'s password has been reset."

### 10. Admin Account Unlock (Minimal, D-38)

Minimal UI on the user management page. Phase 2 scope:
- Button on locked user row: "잠금 해제" / "Unlock Account"
- Confirmation dialog: "{username}님의 계정 잠금을 해제하시겠습니까?" / "Unlock {username}'s account?"
- Success message: "계정 잠금이 해제되었습니다." / "Account has been unlocked."

## Copywriting Contract

All copy must exist in both Korean and English translation files. Korean is the primary language.

### Primary CTAs

| Context | Korean | English |
|---------|--------|---------|
| Login button | 로그인 | Sign In |
| Login loading | 로그인 중... | Signing in... |
| Password change button | 비밀번호 변경 | Change Password |
| Password change loading | 변경 중... | Changing... |
| Admin reset button | 비밀번호 초기화 | Reset Password |
| Admin unlock button | 잠금 해제 | Unlock Account |

### Empty States

| Context | Korean | English |
|---------|--------|---------|
| Login page (default state) | N/A (form is always visible) | N/A |

### Error States

| Context | Korean | English |
|---------|--------|---------|
| Wrong credentials | 이메일 또는 비밀번호가 올바르지 않습니다. | Incorrect email or password. |
| Remaining attempts | 로그인 실패. {n}회 남았습니다. | Login failed. {n} attempts remaining. |
| Account locked | 계정이 잠겼습니다. {mm}:{ss} 후 다시 시도해주세요. | Account is locked. Try again in {mm}:{ss}. |
| Email required | 이메일을 입력해주세요. | Please enter your email. |
| Email invalid | 올바른 이메일 형식이 아닙니다. | Please enter a valid email address. |
| Password required | 비밀번호를 입력해주세요. | Please enter your password. |
| Current password wrong | 현재 비밀번호가 올바르지 않습니다. | Current password is incorrect. |
| Password rules not met | 비밀번호 조건을 충족하지 않습니다. | Password does not meet requirements. |
| Passwords do not match | 비밀번호가 일치하지 않습니다. | Passwords do not match. |
| Network error | 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요. | Cannot connect to server. Please try again shortly. |
| Session expired (silent) | N/A (redirect to login silently per D-16) | N/A |

### Success States

| Context | Korean | English |
|---------|--------|---------|
| Password changed | 비밀번호가 변경되었습니다. | Password has been changed. |
| Admin reset done | {name}님의 비밀번호가 초기화되었습니다. | {name}'s password has been reset. |
| Account unlocked | 계정 잠금이 해제되었습니다. | Account has been unlocked. |

### Destructive Actions

| Action | Confirmation Korean | Confirmation English | Approach |
|--------|--------------------|--------------------|----------|
| Admin password reset | 이 사용자의 비밀번호를 초기화하시겠습니까? | Reset this user's password? | Confirmation dialog (modal) |
| Admin account unlock | {name}님의 계정 잠금을 해제하시겠습니까? | Unlock {name}'s account? | Confirmation dialog (modal) |

### Force Password Change Notice

| Context | Korean | English |
|---------|--------|---------|
| Force change (D-30) | 보안을 위해 비밀번호를 변경해주세요. | Please change your password for security. |

### Password Strength Labels

| Level | Korean | English |
|-------|--------|---------|
| Weak | 약함 | Weak |
| Medium | 보통 | Medium |
| Strong | 강함 | Strong |

### Password Requirement Checklist

| Rule | Korean | English |
|------|--------|---------|
| Min length | 8자 이상 | At least 8 characters |
| Uppercase | 대문자 포함 | Contains uppercase |
| Lowercase | 소문자 포함 | Contains lowercase |
| Number | 숫자 포함 | Contains number |
| Special char | 특수문자 포함 | Contains special character |

## Interaction Patterns

### Focus Management
- Login page: email field receives auto-focus on mount (D-05)
- Password change page: current password field receives auto-focus
- After inline validation error: focus moves to the first invalid field
- Tab order: email -> password -> remember me -> login button

### Keyboard
- Enter key submits form from any field (D-05)
- Tab navigates between fields in logical order
- Space toggles remember-me checkbox and password visibility

### Loading States
- Login button: text replaced with spinner + "로그인 중...", button disabled (D-07)
- Password change button: text replaced with spinner + "변경 중...", button disabled
- Splash screen: centered spinner during auth init check (D-14)

### Animation
- Error banner: fade in from opacity 0 to 1, 200ms ease-out
- Inline validation: fade in, 150ms
- Password strength bar: width transition 300ms ease
- Success banner: fade in, then auto-dismiss after 1500ms with fade out

### Responsive Behavior
- Card is max 400px wide, centered
- Below 480px: card padding reduces from 48px to 24px
- Below 400px: card uses full width with 16px horizontal margin
- Input fields always 16px font (prevents iOS zoom on focus)

## Registry

No shadcn. No third-party registries. All components are custom-built with TailwindCSS utility classes.

| Registry | Status |
|----------|--------|
| shadcn official | Not initialized |
| Third-party | None |

## Tailwind Config Additions

The following must be added to `tailwind.config.js` for this phase:

```js
// Add to module.exports
darkMode: 'media',
```

No custom color tokens or spacing tokens needed beyond Tailwind defaults. All values use standard Tailwind classes.

## i18n File Structure

```
src/i18n/
  config.ts                 # i18next init with browser language detector
  locales/
    ko/
      common.json           # Shared: app name, generic buttons, network errors
      auth.json             # Login, password change, lockout, validation messages
    en/
      common.json
      auth.json
```

Namespace convention: `t('auth:login.button')`, `t('common:error.network')`.

## Accessibility Requirements

- All form inputs must have associated `<label>` elements (not just placeholder text)
- Error messages linked to inputs via `aria-describedby`
- Error banner has `role="alert"` for screen reader announcement
- Password visibility toggle: `aria-label="비밀번호 표시"` / `aria-label="비밀번호 숨기기"`
- Login button disabled state uses `aria-disabled="true"`
- Lockout countdown: `aria-live="polite"` region
- Color contrast: all text meets WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
- Focus visible: 2px ring on all interactive elements via Tailwind `focus-visible:ring-2`

---

*Phase: 02-authentication*
*Contract created: 2026-04-01*
*Source: CONTEXT.md (44 decisions), RESEARCH.md (stack + architecture), tailwind.config.js (existing tokens)*
