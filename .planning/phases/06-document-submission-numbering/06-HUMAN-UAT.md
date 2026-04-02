---
status: partial
phase: 06-document-submission-numbering
source: [06-VERIFICATION.md]
started: 2026-04-02T18:20:00Z
updated: 2026-04-02T18:20:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visual submission flow end-to-end
expected: Submit button appears in editor header, clicking opens confirmation dialog with immutability warning, confirm navigates to detail page showing PREFIX-YYYY-NNNN number, list table shows document number column
result: [pending]

### 2. Read-only mode enforcement in editor for non-DRAFT
expected: Submitted document opened at /documents/{id} redirects to detail page (read-only), no save/submit/delete buttons visible
result: [pending]

### 3. Concurrent submission uniqueness
expected: Two simultaneous submissions for same template+year produce GEN-YYYY-0001 and GEN-YYYY-0002 with no duplicates
result: [pending]

### 4. Validation error display in dialog
expected: Frontend form validation errors shown in submit dialog before submission (e.g., empty title shows error)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
