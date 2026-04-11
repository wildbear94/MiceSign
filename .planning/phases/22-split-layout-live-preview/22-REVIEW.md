---
phase: 22-split-layout-live-preview
reviewed: 2026-04-12T12:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - frontend/public/locales/en/admin.json
  - frontend/public/locales/ko/admin.json
  - frontend/src/features/admin/components/FormPreview/FormPreview.tsx
  - frontend/src/features/admin/components/FormPreview/FullscreenPreviewPortal.tsx
  - frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx
  - frontend/src/features/admin/components/FormPreview/index.ts
  - frontend/src/features/admin/components/TemplateFormModal.tsx
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-04-12T12:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

The split-layout live preview feature adds a FormPreview panel alongside the template editor, with fullscreen portal support. The component architecture is clean: FormPreview, PreviewFieldRenderer, and FullscreenPreviewPortal are well-separated with clear responsibilities. The Escape key handling between the modal and fullscreen portal is correctly implemented using capture-phase event interception in the portal.

Two warnings were found: a missing locale key in the English translation file and a hardcoded Korean string in the close button. Two informational items note minor improvements.

## Warnings

### WR-01: Missing `sidebar.templates` key in English locale

**File:** `frontend/public/locales/en/admin.json:69-73`
**Issue:** The Korean locale (`ko/admin.json` line 73) defines `"sidebar.templates": "양식 관리"`, but the English locale is missing this key entirely. The English `sidebar` object only has `departments`, `positions`, and `users`. When the app runs in English, the sidebar template link will render the raw i18n key or an empty string instead of "Templates".
**Fix:**
```json
"sidebar": {
    "departments": "Departments",
    "positions": "Positions",
    "users": "Users",
    "templates": "Templates"
  },
```

### WR-02: Hardcoded Korean string in close button aria-label

**File:** `frontend/src/features/admin/components/TemplateFormModal.tsx:209`
**Issue:** The close button uses `aria-label="닫기"` as a hardcoded Korean string instead of using the i18n translation function. This breaks accessibility for English-speaking users and bypasses the established localization pattern used everywhere else in the component.
**Fix:**
```tsx
aria-label={t('common.close')}
```

## Info

### IN-01: Missing `registration` and `toast.templateCreated/Updated` keys in English locale

**File:** `frontend/public/locales/en/admin.json`
**Issue:** The Korean locale has a `registration` section (lines 169-222) and extra toast keys (`templateCreated`, `templateUpdated` at lines 234-235) that are absent from the English locale. While this may be intentional (added in a different phase), it will cause missing translation warnings for English users.
**Fix:** Add the missing `registration` block and `toast.templateCreated`/`toast.templateUpdated` keys to the English locale file.

### IN-02: Redundant hidden field check in PreviewFieldRenderer

**File:** `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx:74-75,89-91`
**Issue:** The `hidden` case is handled both inside the `renderInput` switch (line 74-75, returns `null`) and by the early-return guard at line 89-91. The switch case is unreachable because the guard runs first. Additionally, the parent component `FormPreview.tsx` (line 30) already filters out hidden fields before rendering, making both checks redundant.
**Fix:** Remove the `case 'hidden'` from the switch statement since the parent already filters hidden fields. The early-return guard at line 89 can be kept as a safety net.

---

_Reviewed: 2026-04-12T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
