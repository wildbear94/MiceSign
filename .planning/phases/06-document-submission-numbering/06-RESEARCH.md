# Phase 6: Document Submission & Numbering - Research

**Researched:** 2026-04-02
**Domain:** Document state machine, pessimistic locking, Google Drive file management
**Confidence:** HIGH

## Summary

Phase 6 implements document submission -- the DRAFT to SUBMITTED state transition with document numbering and immutability enforcement. The codebase is well-prepared: the `Document` entity already has `docNumber`, `submittedAt` fields; the `doc_sequence` table exists in the schema; the `approval_template` table already has the `prefix` column with seed data (GEN, EXP, LVE); and the `loadAndVerifyOwnerDraft()` helper validates ownership and DRAFT status. The Google Drive service has all primitives needed but lacks a `moveFile()` method.

The core technical challenges are: (1) race-condition-safe document numbering via SELECT FOR UPDATE on `doc_sequence`, (2) Google Drive file move from draft folder to permanent folder, and (3) frontend submit flow integration into the existing editor page with confirmation dialog.

**Primary recommendation:** Use `@Transactional` with pessimistic locking (`@Lock(PESSIMISTIC_WRITE)`) on `DocSequence` lookup, generate the document number within the same transaction as the status change, and move Google Drive files after the DB commit succeeds (or accept the risk of orphaned files in drafts folder on rare Drive API failures).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Submit button placed in editor page header, next to existing save button
- **D-02:** Confirmation dialog before submission -- warns "제출 후 수정할 수 없습니다" with confirm/cancel
- **D-03:** After successful submission, navigate to document detail page
- **D-04:** Submitted documents render in read-only view -- editor components not loaded at all
- **D-05:** Attachments in Google Drive move from `drafts/{docId}/` to `MiceSign/{year}/{month}/{docNumber}/` at submission time
- **D-06:** Backend returns 403 with error message when update/delete API called on non-DRAFT documents
- **D-07:** Attachment deletion blocked for submitted documents
- **D-08:** Prefix uses template code from `approval_template.prefix` column -- GEN-2026-0001, EXP-2026-0001, LVE-2026-0001
- **D-09:** Concurrency control via DB-level pessimistic lock (SELECT FOR UPDATE on doc_sequence row)
- **D-10:** Document number displayed in both detail page and document list -- DRAFT documents show "미발급" or "-"
- **D-11:** Approval line not required for submission in Phase 6
- **D-12:** Dual validation (frontend + backend) for required fields before submission
- **D-13:** Validation errors shown in confirmation dialog

### Claude's Discretion
- Submit API endpoint design (POST /api/documents/{id}/submit or PATCH with status change)
- DocSequence JPA entity and repository implementation details
- Google Drive folder move implementation (copy+delete vs. Drive API move)
- Flyway migration for any schema additions

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-03 | User can submit a draft, triggering document numbering (format: PREFIX-YYYY-NNNN) | DocSequence entity + pessimistic lock pattern, submit endpoint, number generation algorithm |
| DOC-04 | Submitted documents are fully locked (body, attachments, approval line cannot be modified) | Existing `loadAndVerifyOwnerDraft()` guard + 403 error for non-DRAFT updates, frontend read-only routing |
| DOC-07 | Document numbering uses per-template, per-year sequences with race condition protection | SELECT FOR UPDATE on doc_sequence row, unique constraint on doc_number, @Transactional boundary |
</phase_requirements>

## Standard Stack

No new libraries required. This phase uses exclusively existing stack components.

### Core (Already Installed)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| Spring Data JPA | DocSequence entity/repository, pessimistic locking | `@Lock(PESSIMISTIC_WRITE)` native support |
| Google Drive API v3 | File move (addParents/removeParents) | Already configured in GoogleDriveService |
| TanStack Query v5 | Submit mutation hook | Existing pattern from useDocuments.ts |
| Axios | Submit API call | Existing interceptor pattern |

### No New Dependencies
This phase introduces zero new packages. All functionality builds on the existing Spring Boot + React stack.

## Architecture Patterns

### Recommended Project Structure (New Files Only)
```
backend/src/main/java/com/micesign/
  domain/
    DocSequence.java              # NEW: JPA entity for doc_sequence table
  repository/
    DocSequenceRepository.java    # NEW: with pessimistic lock query
  service/
    DocumentService.java          # MODIFY: add submitDocument() method
    GoogleDriveService.java       # MODIFY: add moveFile() method
  controller/
    DocumentController.java       # MODIFY: add submit endpoint

backend/src/main/resources/db/
  migration/                      # No new migration needed (schema exists)
  testmigration/                  # No new migration needed

frontend/src/features/document/
  api/
    documentApi.ts                # MODIFY: add submit API call
  hooks/
    useDocuments.ts               # MODIFY: add useSubmitDocument hook
  pages/
    DocumentEditorPage.tsx        # MODIFY: add submit button + confirmation dialog
  components/
    DocumentListTable.tsx         # MODIFY: add doc_number column
```

### Pattern 1: Submit Endpoint (POST /api/v1/documents/{id}/submit)
**What:** Dedicated submit endpoint rather than PATCH with status change
**When to use:** One-way state transitions with side effects (numbering, file move)
**Why:** Submit has complex side effects (numbering, Drive move, immutability lock). A dedicated endpoint makes the intent clear and keeps the update endpoint simple. POST is appropriate because it triggers a non-idempotent action.

```java
// DocumentController.java
@PostMapping("/{id}/submit")
public ApiResponse<DocumentResponse> submitDocument(
        @AuthenticationPrincipal CustomUserDetails user,
        @PathVariable Long id) {
    return ApiResponse.ok(documentService.submitDocument(user.getUserId(), id));
}
```

### Pattern 2: Pessimistic Locking for Document Numbering
**What:** SELECT FOR UPDATE on doc_sequence row within @Transactional
**When to use:** Concurrent sequence generation with gap-free requirement
**Why:** ~50 employees, low contention. Pessimistic lock is simpler than optimistic retry loops.

```java
// DocSequenceRepository.java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT ds FROM DocSequence ds WHERE ds.templateCode = :templateCode AND ds.year = :year")
Optional<DocSequence> findByTemplateCodeAndYearForUpdate(
    @Param("templateCode") String templateCode, 
    @Param("year") int year);
```

### Pattern 3: Google Drive File Move
**What:** Use Drive API `files.update()` with `addParents` and `removeParents` parameters
**When to use:** Moving files between folders without re-uploading content
**Why:** True move via parent modification -- no copy+delete needed, preserves file ID, atomic operation on Google's side.

```java
// GoogleDriveService.java
public void moveFile(String fileId, String oldParentId, String newParentId) {
    ensureDriveConfigured();
    executeWithRetry(() -> {
        driveClient.files().update(fileId, null)
            .setAddParents(newParentId)
            .setRemoveParents(oldParentId)
            .setSupportsAllDrives(true)
            .setFields("id, parents")
            .execute();
        return null;
    });
}
```

### Pattern 4: Submit Transaction Boundary
**What:** DB operations inside @Transactional, Drive operations after
**When to use:** When mixing DB transactions with external API calls
**Why:** If Drive move fails after DB commit, the document is still correctly submitted with the right number. The files remain in the draft folder but are still accessible. This is the safer failure mode vs. rolling back the numbering.

```java
@Transactional
public DocumentResponse submitDocument(Long userId, Long documentId) {
    // 1. Load and verify DRAFT + ownership
    Document document = loadAndVerifyOwnerDraft(userId, documentId);
    
    // 2. Validate form data for submission (reuse existing validator)
    DocumentContent content = documentContentRepository.findByDocumentId(documentId)
            .orElseThrow(...);
    formValidator.validate(document.getTemplateCode(), content.getBodyHtml(), content.getFormData());
    
    // 3. Generate document number (pessimistic lock inside)
    String docNumber = generateDocNumber(document.getTemplateCode());
    
    // 4. Update document state
    document.setDocNumber(docNumber);
    document.setStatus(DocumentStatus.SUBMITTED);
    document.setSubmittedAt(LocalDateTime.now());
    documentRepository.save(document);
    
    // 5. Move attachments in Google Drive (best-effort, outside critical path)
    moveAttachmentsToPermanentFolder(documentId, docNumber);
    
    return documentMapper.toResponse(document, getTemplateName(document.getTemplateCode()));
}
```

### Anti-Patterns to Avoid
- **Don't use optimistic locking for numbering:** Retry loops add complexity for no benefit at this scale
- **Don't make Drive move part of the rollback condition:** External API failures should not roll back DB state
- **Don't validate approval line in Phase 6:** D-11 explicitly defers this to Phase 7
- **Don't return 400 for non-DRAFT updates:** D-06 specifies 403 (Forbidden), not 400 (Bad Request) -- update the existing `DOC_NOT_DRAFT` error handling

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sequence generation | Custom DB trigger or application-level counter | JPA pessimistic lock on doc_sequence table | DB handles serialization, gap-free guarantee |
| File move across folders | Copy file content + delete original | Drive API `files.update()` with parent modification | Atomic, no re-upload, preserves file ID |
| Confirmation dialog | New dialog component | Existing `ConfirmDialog` from Phase 3 admin | Already has focus trap, escape handling, loading state |

## Common Pitfalls

### Pitfall 1: H2 Pessimistic Lock Compatibility
**What goes wrong:** H2 in MariaDB mode supports SELECT FOR UPDATE but behavior differs slightly from real MariaDB under concurrent access.
**Why it happens:** H2 is a single-connection in-memory DB in tests -- no real lock contention possible.
**How to avoid:** Test the pessimistic lock logic at the repository level (verify query syntax compiles), but accept that true concurrency testing requires a real MariaDB instance. Integration tests should verify the sequence generation logic (correct format, increment), not lock contention.
**Warning signs:** Tests pass in H2 but fail under concurrent load in production.

### Pitfall 2: Google Drive Folder ID Resolution for Move
**What goes wrong:** The `moveFile()` method needs the source folder's Google Drive ID, but `DocumentAttachment.gdriveFolder` stores the path string (e.g., "MiceSign/drafts/DRAFT-123/"), not the folder ID.
**Why it happens:** The `findOrCreateFolder()` method returns a folder ID but the attachment record stores the path.
**How to avoid:** Use `findOrCreateFolder()` to resolve both the old path and new path to their folder IDs before calling moveFile. The folder ID cache in `GoogleDriveService` will make repeated lookups fast.
**Warning signs:** "Folder not found" errors during file move.

### Pitfall 3: DocSequence Row Not Existing Yet
**What goes wrong:** First submission for a template+year combination finds no row in `doc_sequence`, causing the pessimistic lock query to return empty.
**Why it happens:** `doc_sequence` starts empty -- rows are created on demand.
**How to avoid:** If `findByTemplateCodeAndYearForUpdate()` returns empty, INSERT a new row with `last_sequence = 1` and return it. Use a try-catch for unique constraint violation (race condition on first insert) and retry the SELECT FOR UPDATE.
**Warning signs:** NullPointerException on first submission of the year.

### Pitfall 4: Attachment gdrive_folder Column Update After Move
**What goes wrong:** Files are moved in Google Drive but the `document_attachment.gdrive_folder` column still shows the old draft path.
**Why it happens:** Forgetting to update the DB metadata after the Drive move.
**How to avoid:** After successful Drive file move, update each attachment's `gdriveFolder` to the new permanent path. This ensures download URLs and folder references remain correct.
**Warning signs:** Attachments appear to be in "drafts" folder in admin views even after submission.

### Pitfall 5: Error Code Change from 400 to 403
**What goes wrong:** Existing `DOC_NOT_DRAFT` error returns 400 (via BusinessException default), but D-06 requires 403 for submitted document modification attempts.
**Why it happens:** The current `GlobalExceptionHandler` maps all `BusinessException` to 400.
**How to avoid:** Either add a specific error code mapping in GlobalExceptionHandler for DOC_NOT_DRAFT -> 403, or create a `ForbiddenException` subclass. Check the existing exception handler to determine the cleanest approach.
**Warning signs:** Frontend logic that checks for 403 gets 400 instead.

### Pitfall 6: Document Number Displayed as null for DRAFTs
**What goes wrong:** DocumentListTable shows `null` instead of "-" or "미발급" for draft documents.
**Why it happens:** `docNumber` is null for DRAFT documents in the database.
**How to avoid:** Frontend: display "미발급" when `docNumber` is null. The `DocumentResponse` type already has `docNumber: string | null`.
**Warning signs:** "null" literal text in document list.

## Code Examples

### DocSequence JPA Entity
```java
// Source: Verified against V1__create_schema.sql doc_sequence table
@Entity
@Table(name = "doc_sequence")
public class DocSequence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_code", nullable = false, length = 20)
    private String templateCode;

    @Column(name = "year", nullable = false)
    private int year;

    @Column(name = "last_sequence", nullable = false)
    private int lastSequence;

    // getters, setters
}
```

### Document Number Generation
```java
// Source: D-08, D-09 from CONTEXT.md, doc_sequence table DDL
private String generateDocNumber(String templateCode) {
    int currentYear = LocalDateTime.now().getYear();
    
    // Look up template prefix
    ApprovalTemplate template = approvalTemplateRepository.findByCode(templateCode)
            .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다."));
    
    // Pessimistic lock on sequence row
    DocSequence seq = docSequenceRepository
            .findByTemplateCodeAndYearForUpdate(templateCode, currentYear)
            .orElseGet(() -> {
                DocSequence newSeq = new DocSequence();
                newSeq.setTemplateCode(templateCode);
                newSeq.setYear(currentYear);
                newSeq.setLastSequence(0);
                return docSequenceRepository.save(newSeq);
            });
    
    seq.setLastSequence(seq.getLastSequence() + 1);
    docSequenceRepository.save(seq);
    
    // Format: GEN-2026-0001
    return String.format("%s-%d-%04d", template.getPrefix(), currentYear, seq.getLastSequence());
}
```

### Frontend Submit Mutation
```typescript
// Source: Existing useDocuments.ts pattern
export function useSubmitDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      documentApi.submit(id).then((res) => res.data.data!),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
    },
  });
}
```

### Google Drive File Move (via parent modification)
```java
// Source: Google Drive API v3 official docs
// https://developers.google.com/drive/api/guides/folder
public void moveFile(String fileId, String oldParentId, String newParentId) {
    ensureDriveConfigured();
    executeWithRetry(() -> {
        driveClient.files().update(fileId, null)
            .setAddParents(newParentId)
            .setRemoveParents(oldParentId)
            .setSupportsAllDrives(true)
            .setFields("id, parents")
            .execute();
        return null;
    });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DB sequence/auto-increment | Application-level formatted numbering | N/A (project decision) | PREFIX-YYYY-NNNN format requires app logic |
| Google Drive copy+delete | files.update() with parent modification | Drive API v3 | True move, preserves file ID |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test + MockMvc |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.document.*" -x compileQuerydsl` |
| Full suite command | `cd backend && ./gradlew test -x compileQuerydsl` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-03 | Submit draft triggers numbering | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.submitDraft*"` | Wave 0 |
| DOC-03 | Document number format PREFIX-YYYY-NNNN | unit | `./gradlew test --tests "com.micesign.document.DocumentServiceTest.generateDocNumber*"` | Wave 0 |
| DOC-04 | Update submitted doc returns 403 | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.updateSubmitted*"` | Wave 0 |
| DOC-04 | Delete submitted doc returns 403 | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.deleteSubmitted*"` | Wave 0 |
| DOC-04 | Attachment upload blocked for submitted doc | integration | `./gradlew test --tests "com.micesign.document.DocumentAttachmentServiceTest.upload*Submitted*"` | Wave 0 |
| DOC-07 | Concurrent numbering produces unique numbers | unit | `./gradlew test --tests "com.micesign.document.DocumentServiceTest.concurrentNumbering*"` | Wave 0 |
| DOC-07 | First submission creates doc_sequence row | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.submitFirstOfYear*"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.document.*" -x compileQuerydsl`
- **Per wave merge:** `cd backend && ./gradlew test -x compileQuerydsl`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` -- covers DOC-03, DOC-04 (submit endpoint, immutability guards)
- [ ] `backend/src/test/java/com/micesign/document/DocSequenceTest.java` -- covers DOC-07 (numbering format, sequence increment)
- [ ] Test migration update if any schema changes needed (likely none)

## Open Questions

1. **Error code 400 vs 403 for DOC_NOT_DRAFT**
   - What we know: Current `GlobalExceptionHandler` maps all `BusinessException` to 400. D-06 requires 403 for modification attempts on submitted documents.
   - What's unclear: Best approach -- subclass exception, add HTTP status to BusinessException, or map specific error codes in handler.
   - Recommendation: Add an optional `httpStatus` field to `BusinessException` (default 400). Set 403 for DOC_NOT_DRAFT. Minimal change, backward compatible.

2. **Drive move failure handling**
   - What we know: If Drive move fails after DB commit, document is submitted but files remain in draft folder.
   - What's unclear: Whether to add a retry/cleanup mechanism or accept the risk.
   - Recommendation: Log a warning and accept the failure. Files are still accessible from the draft folder. A future cleanup job could reconcile, but this is unnecessary for ~50 users.

3. **Race condition on first doc_sequence INSERT**
   - What we know: Two concurrent submissions for the same template+year when no row exists could both try to INSERT.
   - What's unclear: Whether H2 unique constraint violation behaves identically to MariaDB.
   - Recommendation: Use try-catch around the INSERT, retry the SELECT FOR UPDATE on unique constraint violation. Test in integration tests with sequential calls.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `V1__create_schema.sql` -- doc_sequence table DDL with `uk_template_year` unique key
- Codebase analysis: `V2__seed_initial_data.sql` -- approval_template prefix values (GEN, EXP, LVE)
- Codebase analysis: `Document.java` -- docNumber, submittedAt, status fields already mapped
- Codebase analysis: `DocumentService.java` -- loadAndVerifyOwnerDraft() pattern, existing transaction boundaries
- Codebase analysis: `GoogleDriveService.java` -- retry logic, folder cache, existing CRUD methods
- Codebase analysis: `DocumentAttachmentService.java` -- buildFolderPath() returns `MiceSign/drafts/DRAFT-{id}/`

### Secondary (MEDIUM confidence)
- [Google Drive API v3 - Folder operations](https://developers.google.com/drive/api/guides/folder) -- file move via addParents/removeParents
- [Drive API files resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) -- files.update method reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, all existing stack
- Architecture: HIGH - patterns follow existing codebase conventions, well-documented decisions in CONTEXT.md
- Pitfalls: HIGH - identified from direct codebase analysis and known JPA/H2 behaviors

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable -- no external dependency changes expected)
