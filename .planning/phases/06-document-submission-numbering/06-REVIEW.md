---
phase: 06-document-submission-numbering
reviewed: 2026-04-09T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - backend/src/main/java/com/micesign/service/DocumentService.java
  - backend/src/main/resources/db/migration/V17__fix_leave_prefix.sql
  - backend/src/test/java/com/micesign/document/DocumentSubmitTest.java
  - backend/src/test/resources/db/testmigration/V17__fix_leave_prefix.sql
  - backend/src/test/resources/db/testmigration/V8__add_missing_template_columns.sql
  - frontend/public/locales/en/document.json
  - frontend/public/locales/ko/document.json
  - frontend/src/features/admin/components/ConfirmDialog.tsx
  - frontend/src/features/document/api/documentApi.ts
  - frontend/src/features/document/components/DocumentListTable.tsx
  - frontend/src/features/document/components/attachment/FileAttachmentArea.tsx
  - frontend/src/features/document/hooks/useDocuments.ts
  - frontend/src/features/document/pages/DocumentDetailPage.tsx
  - frontend/src/features/document/pages/DocumentEditorPage.tsx
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-04-09
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 6 delivers document submission with sequential numbering (`{prefix}-{year}-{sequence}`), immutability enforcement, attachment handling, and the frontend submit flow. The overall design is sound. The pessimistic-lock sequence generation strategy is correct for the concurrency requirements. The immutability check via `loadAndVerifyOwnerDraft` is applied consistently.

One critical issue was found: a race condition in `generateDocNumber` where a new sequence row is created outside the locked transaction path, meaning two concurrent first-submission requests can both create a `DocSequence` row and both assign sequence 1, producing duplicate document numbers.

Five warnings cover logic gaps: a silently swallowed attachment-move failure that can leave attachments unreachable after submission, a missing `showSubmitConfirm(false)` close in the happy-path submit flow causing the dialog to remain open, stale `autoSave` dependency array triggering incorrect save cadence, test assertions using `assert` instead of JUnit 5 `assertThat`/`assertEquals` (makes failures undetectable in some runners), and a `withdrawDocument` null-pointer risk when `getCurrentStep()` is null.

---

## Critical Issues

### CR-01: Race condition — duplicate document numbers possible on first submission

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:472-485`

**Issue:** `docSequenceRepository.findByTemplateCodeAndYearForUpdate(...)` acquires a pessimistic lock only if a row already exists. When the row does not yet exist (first submission in a year), the `orElseGet` lambda calls `docSequenceRepository.save(newSeq)` without holding any lock. Two concurrent requests that both find no row will both create a new row with `lastSequence = 0`, then both increment to 1 and save, resulting in two documents with the same number (e.g., `GEN-2026-0001`).

The standard fix is to use an `INSERT ... ON DUPLICATE KEY UPDATE` or a dedicated sequence-creation lock. The simplest Spring-compatible approach is to use a database-level unique constraint on `(template_code, year)` combined with a retry loop, or to hold the lock at the entity level from the very start using a dummy "ensure-row-exists" step done in a separate committed transaction before the main lock attempt.

**Fix:**
```java
// Option A: catch DataIntegrityViolationException on initial insert and retry
// Option B (simpler): initialize rows for all templates at migration time so
// findByTemplateCodeAndYearForUpdate always finds an existing row.
// Add to Flyway migration (e.g. V18):
//   INSERT IGNORE INTO doc_sequence (template_code, year, last_sequence)
//   SELECT code, YEAR(NOW()), 0 FROM approval_template;
// Then remove the orElseGet branch entirely:

DocSequence seq = docSequenceRepository
    .findByTemplateCodeAndYearForUpdate(templateCode, currentYear)
    .orElseThrow(() -> new BusinessException(
        "SEQ_NOT_FOUND",
        "문서 번호 시퀀스가 초기화되지 않았습니다. 관리자에게 문의하세요."));
```

---

## Warnings

### WR-01: Attachment move failure silently breaks the submission

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:588-591`

**Issue:** `moveAttachmentsToPermanentFolder` catches all exceptions and logs a warning, but the method is called inside `submitDocument` after the document has already been committed as `SUBMITTED` with a `docNumber`. If the folder move fails, the attachments remain in the draft path with stale `gdriveFolder` metadata. The document appears submitted but its attachments are orphaned — download will fail silently for the user and there is no recovery path.

The transaction boundary does not help here because the Google Drive call is an external side-effect: even if the transaction were rolled back, the docNumber sequence has already been incremented.

**Fix:** Either:
1. Accept the current degraded-mode behavior but emit an ERROR-level log (not WARN) and expose an admin reconciliation endpoint to re-run the move, or
2. Set `attachment.setGdriveFolder` only after a successful move and persist the update; on failure, mark the attachment with a `pendingMove = true` flag and process asynchronously.

At minimum change `log.warn` to `log.error` so the failure does not go unnoticed in production monitoring.

```java
} catch (Exception e) {
    log.error("CRITICAL: Failed to move attachments to permanent folder for document {}. " +
              "Attachments are still accessible at draft path. Manual reconciliation required. Error: {}",
              documentId, e.getMessage(), e);
}
```

### WR-02: Submit confirm dialog stays open after successful submission

**File:** `frontend/src/features/document/pages/DocumentEditorPage.tsx:145-174`

**Issue:** `handleSubmitConfirm` navigates away on success but never calls `setShowSubmitConfirm(false)`. On the happy path the navigation unmounts the component so this has no immediate effect, but if navigation is blocked by a router guard or the user presses back within the 5-second success banner window, the confirm dialog will reappear in its open state. The error path at line 163 correctly closes the dialog, making the omission on the success path an inconsistency and a latent bug.

**Fix:**
```typescript
const result = await submitMutation.mutateAsync(savedDocId);
setShowSubmitConfirm(false);   // <-- add this line
navigate(`/documents/${savedDocId}`, {
  state: { submitSuccess: true, docNumber: result.docNumber },
});
```

### WR-03: `useAutoSave` dependency array is stale — does not trigger on form data changes

**File:** `frontend/src/features/document/pages/DocumentEditorPage.tsx:95-99`

**Issue:** `useAutoSave` is called with `[formDataRef.current]` as the dependency array:

```typescript
const { status: autoSaveStatus, saveNow } = useAutoSave(
  autoSaveFn,
  [formDataRef.current],   // <-- stale reference
  30000,
);
```

`formDataRef.current` is an object reference. Because `formDataRef` is a `useRef`, the `.current` property is mutated in place by `handleSave` — the reference identity never changes. Depending on how `useAutoSave` compares dependencies, this likely means the auto-save timer is never reset when the user edits the form. The intent appears to be to restart the debounce window on every keystroke, but it will never fire (or fire only on the initial mount).

**Fix:** Use a separate state counter or a dedicated `lastModified` timestamp ref to signal changes:

```typescript
const [saveVersion, setSaveVersion] = useState(0);
// In handleSave, after updating formDataRef.current:
setSaveVersion(v => v + 1);
// Then:
const { status: autoSaveStatus, saveNow } = useAutoSave(autoSaveFn, [saveVersion], 30000);
```

### WR-04: `withdrawDocument` null pointer when `currentStep` is null

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:338-345`

**Issue:** After Phase 6, a document submitted without approval lines has `currentStep = null` (line 294 comment: "If no approval lines, currentStep stays null"). `withdrawDocument` at line 338 calls:

```java
List<ApprovalLine> currentStepLines = approvalLineRepository
    .findByDocumentIdAndStepOrder(docId, document.getCurrentStep());
```

If `document.getCurrentStep()` returns `null`, the query will be passed a null step order. Depending on the JPA implementation this may throw a `NullPointerException`, or silently return an empty list (which then allows immediate withdrawal — probably correct). The behavior is undefined and repository-dependent.

**Fix:** Guard the step lookup:

```java
List<ApprovalLine> currentStepLines = document.getCurrentStep() != null
    ? approvalLineRepository.findByDocumentIdAndStepOrder(docId, document.getCurrentStep())
    : Collections.emptyList();
```

### WR-05: Test assertions use `assert` keyword instead of JUnit 5 assertions

**File:** `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java:95, 109, 123, 232-235`

**Issue:** Multiple tests use Java's built-in `assert` statement (e.g., `assert docNumber.equals("GEN-..." )`). Java assertions are disabled by default in the JVM unless `-ea` is passed. In a standard Gradle test run (without `-ea`), these assertions are silently skipped — the tests will pass even if the `docNumber` is wrong. This defeats the purpose of the tests entirely.

```java
// Line 95
assert docNumber.equals("GEN-" + currentYear + "-0001");
// Line 123
assert docNumber.startsWith("LEV-") : "Expected LEV- prefix but got: " + docNumber;
```

**Fix:** Replace with JUnit 5 / AssertJ assertions:

```java
import static org.assertj.core.api.Assertions.assertThat;

// Line 95:
assertThat(docNumber).isEqualTo("GEN-" + currentYear + "-0001");

// Line 109:
assertThat(docNumber).startsWith("EXP-" + currentYear);

// Line 123:
assertThat(docNumber).as("Expected LEV- prefix").startsWith("LEV-");

// Lines 232-235:
assertThat(docNumber1).isEqualTo("GEN-" + currentYear + "-0001");
assertThat(docNumber2).isEqualTo("GEN-" + currentYear + "-0002");
```

---

## Info

### IN-01: Commented-out approval line validation is a functional gap with no guardrail

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:258-270`

**Issue:** The approval line validation (minimum one APPROVE type, drafter cannot be in line) is fully commented out with a `// TODO Phase 7: Re-enable` comment. Until Phase 7, any document can be submitted with zero approval lines or with the drafter in the approval line. This is an intentional Phase 6 scope decision, but the TODO comment is the only guard. If Phase 7 is delayed or the comment is overlooked, invalid documents will silently enter production data.

**Fix:** Consider adding a `@Deprecated`-style marker or a feature flag check rather than dead-commented code, so the gap is surfaced during Phase 7 planning. No code change required now, but track as Phase 7 prerequisite.

### IN-02: `DocumentEditorPage` hardcodes `"DRAFT"` status for `FileAttachmentArea`

**File:** `frontend/src/features/document/pages/DocumentEditorPage.tsx:286`

**Issue:** `FileAttachmentArea` receives `documentStatus="DRAFT"` as a string literal instead of deriving it from the loaded document state. The `documentStatus` prop is currently unused (`_documentStatus`) in `FileAttachmentArea`, but if it is used in a future iteration, the hardcoded value will mask the actual document status.

**Fix:** Pass the actual status when available:
```typescript
documentStatus={existingDoc?.status ?? 'DRAFT'}
```

### IN-03: `DocumentDetailPage` has hardcoded Korean strings not routed through i18n

**File:** `frontend/src/features/document/pages/DocumentDetailPage.tsx:115-132`

**Issue:** Several metadata field labels in the detail view are hardcoded Korean strings (`"양식"`, `"상태"`, `"기안자"`, `"문서번호"`, `"작성일"`, `"제출일"`) rather than `t(...)` calls. The `en/document.json` already has translation keys for `columns.template`, `columns.status`, `columns.docNumber`, `columns.createdAt`. This inconsistency means the detail page will not translate correctly if the app is viewed in English.

**Fix:** Replace hardcoded labels with `t('columns.template')`, `t('columns.status')`, etc., and add missing keys (`drafter`, `submittedAt`) to both locale files.

### IN-04: `V17__fix_leave_prefix.sql` comment says `LVE -> LEV` but prior prefix is unknown

**File:** `backend/src/main/resources/db/migration/V17__fix_leave_prefix.sql:2`

**Issue:** The comment reads `Fix LEAVE template prefix: LVE -> LEV` but neither the test seed data nor earlier migrations show the prefix was ever `LVE`. If the original prefix was already `LEV` (or something else entirely), the migration is a no-op and the comment is misleading. This is a minor documentation inconsistency but could cause confusion when bisecting historical data issues.

**Fix:** Verify the value in the V2 seed migration and correct the comment to reflect the actual before/after values.

---

_Reviewed: 2026-04-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
