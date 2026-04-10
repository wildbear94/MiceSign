---
phase: 05-file-attachments
reviewed: 2026-04-10T12:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - backend/src/main/java/com/micesign/config/GoogleDriveConfig.java
  - backend/src/main/java/com/micesign/controller/DocumentController.java
  - backend/src/main/java/com/micesign/domain/DocumentAttachment.java
  - backend/src/main/java/com/micesign/dto/document/AttachmentResponse.java
  - backend/src/main/java/com/micesign/mapper/DocumentAttachmentMapper.java
  - backend/src/main/java/com/micesign/repository/DocumentAttachmentRepository.java
  - backend/src/main/java/com/micesign/service/DocumentAttachmentService.java
  - backend/src/main/java/com/micesign/service/GoogleDriveService.java
  - backend/src/test/java/com/micesign/document/AttachmentControllerTest.java
  - backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java
  - backend/src/test/java/com/micesign/document/DocumentControllerTest.java
  - frontend/src/features/document/api/attachmentApi.ts
  - frontend/src/features/document/components/attachment/FileAttachmentArea.tsx
  - frontend/src/features/document/components/attachment/FileDropZone.tsx
  - frontend/src/features/document/components/attachment/FileItem.tsx
  - frontend/src/features/document/components/attachment/fileIcons.ts
  - frontend/src/features/document/components/attachment/fileValidation.ts
  - frontend/src/features/document/components/attachment/useFileUpload.ts
  - frontend/src/features/document/components/templates/ExpenseForm.tsx
  - frontend/src/features/document/components/templates/GeneralForm.tsx
  - frontend/src/features/document/components/templates/LeaveForm.tsx
  - frontend/src/features/document/hooks/useAttachments.ts
  - frontend/src/features/document/pages/DocumentDetailPage.tsx
  - frontend/src/features/document/types/document.ts
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-10T12:00:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

The file attachment feature is well-structured overall, with proper separation between backend services, a clean upload/download API, frontend upload queue management with cancellation support, and thorough test coverage. Key concerns center around two critical security issues (missing MIME type validation on download and potential partial upload inconsistency), several missing authorization and error handling gaps, and a few code quality items.

## Critical Issues

### CR-01: Missing MIME Type Validation on Download Response

**File:** `backend/src/main/java/com/micesign/controller/DocumentController.java:111`
**Issue:** The `downloadAttachment` endpoint uses `MediaType.parseMediaType(metadata.mimeType())` to set the response Content-Type. The `mimeType` value comes from `file.getContentType()` at upload time, which is client-controlled and can be spoofed. If a malicious user uploads an HTML file with `text/html` MIME type, other users downloading it could have JavaScript executed in the context of the application's origin (stored XSS via file download). `MediaType.parseMediaType` will also throw `InvalidMediaTypeException` for malformed MIME type strings, causing an unhandled 500 error.
**Fix:**
```java
// 1. Sanitize MIME type - force download for dangerous types
private static final Set<String> SAFE_MIME_TYPES = Set.of(
    "application/pdf", "image/png", "image/jpeg", "image/gif",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
);

// In downloadAttachment:
String mimeType = metadata.mimeType();
MediaType mediaType;
try {
    mediaType = SAFE_MIME_TYPES.contains(mimeType)
        ? MediaType.parseMediaType(mimeType)
        : MediaType.APPLICATION_OCTET_STREAM;
} catch (Exception e) {
    mediaType = MediaType.APPLICATION_OCTET_STREAM;
}
```

### CR-02: Partial Upload Leaves Orphaned Files in Google Drive

**File:** `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java:78-102`
**Issue:** When uploading multiple files, if file N succeeds but file N+1 fails (either during Google Drive upload or DB save), the already-uploaded files remain in Google Drive and the database. The method is `@Transactional` so DB records for the current batch will roll back, but previously committed Google Drive files will be orphaned (Drive operations are not transactional). Additionally, the class-level `@Transactional` annotation means the `uploadFiles` method runs in a transaction, but the `IOException` catch on line 98 throws `BusinessException` which will cause a rollback of all DB saves in that batch -- yet the Drive files for earlier iterations in the loop remain.
**Fix:**
```java
// Track uploaded Drive file IDs for cleanup on failure
List<String> uploadedDriveIds = new ArrayList<>();
try {
    for (MultipartFile file : files) {
        // ... upload logic ...
        uploadedDriveIds.add(result.fileId());
        // ... save to DB ...
    }
} catch (Exception e) {
    // Cleanup orphaned Drive files
    for (String driveId : uploadedDriveIds) {
        try {
            googleDriveService.deleteFile(driveId);
        } catch (Exception cleanup) {
            log.warn("Failed to cleanup orphaned Drive file: {}", driveId, cleanup);
        }
    }
    throw e;
}
```

## Warnings

### WR-01: Missing Document Status Check on Upload

**File:** `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java:169-178`
**Issue:** The `validateDocumentForUpload` method checks that the user is the drafter, but does not check that the document is in DRAFT status. The `deleteAttachment` method correctly enforces this (line 133), but uploads to SUBMITTED/APPROVED documents are not blocked. Per the PRD's document immutability rule: "Once submitted, document body, attachments, and approval line are locked."
**Fix:**
```java
private Document validateDocumentForUpload(Long userId, Long docId) {
    Document document = documentRepository.findById(docId)
            .orElseThrow(() -> new BusinessException("DOCUMENT_NOT_FOUND", "문서를 찾을 수 없습니다."));

    if (document.getStatus() != DocumentStatus.DRAFT) {
        throw new BusinessException("DOC_NOT_DRAFT", "임시저장 상태의 문서에만 파일을 첨부할 수 있습니다.");
    }

    if (!document.getDrafter().getId().equals(userId)) {
        throw new BusinessException("DOCUMENT_ACCESS_DENIED", "본인의 문서에만 파일을 첨부할 수 있습니다.");
    }

    return document;
}
```

### WR-02: Missing Authorization Check on List Attachments Endpoint

**File:** `backend/src/main/java/com/micesign/controller/DocumentController.java:91-96`
**Issue:** The `getAttachments` endpoint accepts `@AuthenticationPrincipal CustomUserDetails user` but never passes `user` to the service. The `getAttachmentsByDocumentId` method on line 147-150 performs no authorization check -- any authenticated user can list attachments for any document by ID. This is an authorization gap.
**Fix:**
```java
// In controller:
return ApiResponse.ok(attachmentService.getAttachmentsByDocumentId(user.getUserId(), docId));

// In service, add access check:
public List<AttachmentResponse> getAttachmentsByDocumentId(Long userId, Long docId) {
    validateDocumentAccess(userId, docId);
    List<DocumentAttachment> attachments = attachmentRepository.findByDocumentId(docId);
    return attachmentMapper.toResponseList(attachments);
}
```

### WR-03: GoogleDriveConfig Bean Returns Null Instead of Failing

**File:** `backend/src/main/java/com/micesign/config/GoogleDriveConfig.java:33-36`
**Issue:** When `credentialsPath` is blank, the bean method returns `null`. This bypasses the `@ConditionalOnProperty` guard (which only checks if the property exists, not if it's non-blank). The `GoogleDriveService` accepts `@Nullable Drive driveClient` and defers failure to `ensureDriveConfigured()`, but this means file operations will fail at runtime with a generic "파일 저장소가 설정되지 않았습니다" error instead of failing at application startup. For production, this should fail fast.
**Fix:**
```java
@Bean
@ConditionalOnProperty(name = "google.drive.credentials-path")
public Drive googleDriveClient(@Value("${google.drive.credentials-path}") String credentialsPath)
        throws IOException, GeneralSecurityException {
    if (credentialsPath == null || credentialsPath.isBlank()) {
        throw new IllegalStateException(
            "google.drive.credentials-path is configured but empty. "
            + "Remove the property to disable Drive integration, or provide a valid path.");
    }
    // ... rest of method
}
```

### WR-04: FileInputStream Not Closed on Exception in GoogleDriveConfig

**File:** `backend/src/main/java/com/micesign/config/GoogleDriveConfig.java:38`
**Issue:** `new FileInputStream(credentialsPath)` is passed directly to `GoogleCredentials.fromStream()`. If `fromStream()` throws, the `FileInputStream` is never closed. This is a resource leak.
**Fix:**
```java
try (FileInputStream fis = new FileInputStream(credentialsPath)) {
    GoogleCredentials credentials = GoogleCredentials
            .fromStream(fis)
            .createScoped(Collections.singletonList(DriveScopes.DRIVE_FILE));
    // ... build Drive client
}
```

### WR-05: Non-null Assertion on API Response Data

**File:** `frontend/src/features/document/api/attachmentApi.ts:25-26`
**Issue:** `data.data!` uses non-null assertion. If the backend returns a successful response with `data: null` (which is possible given `ApiResponse.ok(null)` is used elsewhere in the codebase), this will cause a runtime error when the caller tries to iterate over the result.
**Fix:**
```typescript
return data.data ?? [];
```

## Info

### IN-01: Credentials File Path Logged at INFO Level

**File:** `backend/src/main/java/com/micesign/config/GoogleDriveConfig.java:41`
**Issue:** The credentials file path is logged at INFO level. While not the credentials themselves, the file path to a service account key file is sensitive operational information that should not appear in production logs.
**Fix:** Change to `log.debug(...)` or remove the path from the log message.

### IN-02: Hardcoded Korean Error Messages in Frontend Validation

**File:** `frontend/src/features/document/components/attachment/fileValidation.ts:19-23`
**Issue:** Error messages are hardcoded in Korean rather than using the i18n translation system (`useTranslation`) that is used consistently elsewhere in the frontend. This creates inconsistency and makes future internationalization harder.
**Fix:** Move these messages to the `document` translation namespace and use translation keys.

### IN-03: Unused `_documentStatus` Parameter in FileAttachmentArea

**File:** `frontend/src/features/document/components/attachment/FileAttachmentArea.tsx:20`
**Issue:** The `documentStatus` prop is destructured as `_documentStatus` (indicating it is intentionally unused). It is passed from all three form templates as a hardcoded `"DRAFT"`. The component does not use this value for any logic. Consider removing it if it is not planned for future use, or adding a comment explaining the intended future use.
**Fix:** Either remove the prop or add a `// TODO: Use documentStatus to control read-only mode for non-DRAFT documents` comment.

---

_Reviewed: 2026-04-10T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
