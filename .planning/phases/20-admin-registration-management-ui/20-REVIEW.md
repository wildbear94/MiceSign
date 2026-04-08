---
phase: 20-admin-registration-management-ui
reviewed: 2026-04-08T12:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - backend/src/main/java/com/micesign/dto/registration/RegistrationListResponse.java
  - backend/src/main/java/com/micesign/mapper/RegistrationMapper.java
  - backend/src/main/java/com/micesign/service/RegistrationService.java
  - frontend/package.json
  - frontend/public/locales/en/admin.json
  - frontend/public/locales/ko/admin.json
  - frontend/src/App.tsx
  - frontend/src/features/admin/api/registrationApi.ts
  - frontend/src/features/admin/components/AdminSidebar.tsx
  - frontend/src/features/admin/components/RegistrationDetailModal.tsx
  - frontend/src/features/admin/components/RegistrationStatusTabs.tsx
  - frontend/src/features/admin/components/RegistrationTable.tsx
  - frontend/src/features/admin/hooks/useRegistrations.ts
  - frontend/src/features/admin/pages/RegistrationListPage.tsx
  - frontend/src/types/admin.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-04-08T12:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This phase adds an admin registration management UI (list, detail modal, approve/reject workflow) on the frontend and extends the backend DTO/mapper/service to support the list view with assignment info for approved registrations.

Overall the code is well-structured: proper use of TanStack Query hooks, clean component decomposition, good accessibility (focus trap, aria attributes, keyboard navigation), and proper i18n setup. The backend service has solid validation and transactional boundaries.

Issues found are primarily around unsafe non-null assertions that could cause runtime crashes, hardcoded Korean strings bypassing the i18n system, and minor code duplication.

## Warnings

### WR-01: Non-null assertion on API response data can crash at runtime

**File:** `frontend/src/features/admin/hooks/useRegistrations.ts:12`
**Issue:** The query function uses `res.data.data!` (non-null assertion). If the API returns `{ success: true, data: null }` (e.g., empty result edge case or API contract change), this will produce `undefined` that downstream code treats as a valid `PageResponse`, causing a runtime crash when accessing `.content`, `.totalElements`, etc.
**Fix:**
```typescript
queryFn: () =>
  registrationApi.getList(params).then((res) => {
    if (!res.data.data) {
      return { content: [], totalElements: 0, totalPages: 0, number: 0, size: params.size ?? 20 };
    }
    return res.data.data;
  }),
```

The same pattern appears on line 23 for `usePendingRegistrationCount` -- `res.data.data!.totalElements` should also guard against null.

### WR-02: Hardcoded Korean strings bypass i18n system

**File:** `frontend/src/features/admin/components/AdminSidebar.tsx:33`
**File:** `frontend/src/features/admin/components/AdminSidebar.tsx:92`
**File:** `frontend/src/features/admin/components/RegistrationDetailModal.tsx:278`
**File:** `frontend/src/features/admin/components/RegistrationDetailModal.tsx:298`
**File:** `frontend/src/features/admin/components/RegistrationDetailModal.tsx:316`
**Issue:** Several UI strings are hardcoded in Korean rather than using the `t()` translation function:
- AdminSidebar lines 33 and 92: `"대시보드로 돌아가기"` (Go back to dashboard)
- RegistrationDetailModal line 278: `"부서를 선택해주세요"` (Select department placeholder)
- RegistrationDetailModal line 298: `"직급을 선택해주세요"` (Select position placeholder)
- RegistrationDetailModal line 316: `"예: EMP001"` (Example employee number placeholder)

This breaks the English locale and violates the i18n pattern used throughout the rest of the codebase.
**Fix:** Add translation keys to `admin.json` locale files and replace hardcoded strings with `t('...')` calls. For example:
```typescript
// AdminSidebar
<span className="hidden xl:inline">{t('sidebar.backToDashboard')}</span>

// RegistrationDetailModal
<option value="">{t('registration.modal.selectDepartment')}</option>
```

### WR-03: Unsafe type cast on error without runtime validation

**File:** `frontend/src/features/admin/components/RegistrationDetailModal.tsx:154`
**Issue:** `const axiosError = err as AxiosError<ApiResponse<null>>` casts the caught error without verifying it is actually an AxiosError. If a non-Axios error is thrown (e.g., a state update error, network timeout with a different shape), accessing `axiosError.response?.data?.error?.code` could fail silently or produce unexpected behavior. While optional chaining prevents a crash, the error code check on line 156 would always be false, and the user would only see a generic error toast -- which is acceptable but could mask debugging info.
**Fix:** Use the `isAxiosError` type guard from axios:
```typescript
import axios from 'axios';

function handleError(err: unknown) {
  if (axios.isAxiosError<ApiResponse<null>>(err)) {
    const errorCode = err.response?.data?.error?.code;
    if (errorCode === 'REGISTRATION_ALREADY_PROCESSED' || err.response?.status === 409) {
      toast.error(t('registration.toast.alreadyProcessed'));
      return;
    }
  }
  toast.error(t('registration.toast.error'));
}
```

## Info

### IN-01: Duplicated REG_STATUS_BADGE constant

**File:** `frontend/src/features/admin/components/RegistrationDetailModal.tsx:18-24`
**File:** `frontend/src/features/admin/components/RegistrationTable.tsx:14-20`
**Issue:** The `REG_STATUS_BADGE` record mapping status to Tailwind classes is defined identically in both files. This creates a maintenance risk if badge styling needs to change.
**Fix:** Extract to a shared constant, e.g., `frontend/src/features/admin/constants/registrationStyles.ts`.

### IN-02: Duplicated formatDate utility

**File:** `frontend/src/features/admin/components/RegistrationDetailModal.tsx:41-49`
**File:** `frontend/src/features/admin/components/RegistrationTable.tsx:36-44`
**Issue:** `formatDate` is defined in both components with slightly different options (modal includes `hour12: false`, table does not). This inconsistency means dates may display differently in the table vs. the modal.
**Fix:** Extract a single `formatDate` utility to a shared location and ensure consistent formatting options.

### IN-03: Backend mapper toListResponse method appears unused

**File:** `backend/src/main/java/com/micesign/mapper/RegistrationMapper.java:14-17`
**Issue:** The `toListResponse` method ignores the three assignment fields (`employeeNo`, `departmentName`, `positionName`), but the service (`RegistrationService.toListResponseWithAssignment` at line 113) manually constructs `RegistrationListResponse` via its record constructor instead of calling this mapper method. The mapper method is effectively dead code.
**Fix:** Either remove the unused `toListResponse` method from the mapper, or refactor the service to use the mapper with `@AfterMapping` or expression-based mappings to populate assignment fields.

### IN-04: Rejection error display logic has a minor gap

**File:** `frontend/src/features/admin/components/RegistrationDetailModal.tsx:362-368`
**Issue:** The inline validation shows the min-length message when `rejectionReason.length > 0 && < 10` (line 362), and the `rejectError` state message shows only when `rejectionReason.length === 0` (line 367). If the user types 10+ chars (clearing `rejectError` via the onChange handler on line 357), then deletes back to 1-9 chars, the inline validation correctly re-appears. However, if the user never types anything and clicks "Confirm Reject", `handleRejectConfirm` sets `rejectError` but the inline check on line 362 won't fire (length is 0), so only the state-based error on line 367 shows. This works correctly but the two-path error display is fragile and could confuse future maintainers.
**Fix:** Simplify to a single error display mechanism -- either always use the state-based error or always use inline length checks.

---

_Reviewed: 2026-04-08T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
