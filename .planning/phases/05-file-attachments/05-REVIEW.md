---
phase: 05-file-attachments
reviewed: 2026-04-08T12:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - backend/src/main/java/com/micesign/config/GoogleDriveConfig.java
  - backend/src/main/java/com/micesign/domain/DocumentAttachment.java
  - backend/src/main/java/com/micesign/repository/DocumentAttachmentRepository.java
  - backend/src/main/java/com/micesign/dto/document/AttachmentResponse.java
  - backend/src/main/java/com/micesign/mapper/DocumentAttachmentMapper.java
  - backend/src/main/java/com/micesign/service/GoogleDriveService.java
  - backend/src/main/java/com/micesign/service/DocumentAttachmentService.java
  - backend/src/test/java/com/micesign/document/AttachmentControllerTest.java
  - backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java
  - backend/src/main/java/com/micesign/controller/DocumentController.java
  - backend/src/test/java/com/micesign/document/DocumentControllerTest.java
  - frontend/src/features/document/api/attachmentApi.ts
  - frontend/src/features/document/hooks/useAttachments.ts
  - frontend/src/features/document/components/attachment/FileDropZone.tsx
  - frontend/src/features/document/components/attachment/FileItem.tsx
  - frontend/src/features/document/components/attachment/FileAttachmentArea.tsx
  - frontend/src/features/document/components/attachment/useFileUpload.ts
  - frontend/src/features/document/components/attachment/fileValidation.ts
  - frontend/src/features/document/components/attachment/fileIcons.ts
  - frontend/src/features/document/types/document.ts
  - frontend/public/locales/ko/document.json
  - frontend/public/locales/en/document.json
  - frontend/src/features/document/components/templates/GeneralForm.tsx
  - frontend/src/features/document/components/templates/ExpenseForm.tsx
  - frontend/src/features/document/components/templates/LeaveForm.tsx
  - frontend/src/features/document/pages/DocumentDetailPage.tsx
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-08T12:00:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Phase 5 implements file attachments with Google Drive as the storage backend. The implementation covers upload, download, delete, and batch upload flows with proper validation on both backend and frontend. Overall code quality is good with thorough test coverage and consistent patterns. However, there are two critical security issues (audit log injection and missing MIME type validation on the server side relying on client-supplied Content-Type), several warnings around error handling and parameter ordering, and a few informational items.

## Critical Issues

### CR-01: Audit Log JSON Injection via Filename

**File:** `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java:115-116`
**Issue:** The original filename is interpolated directly into a JSON string without escaping. A filename containing double quotes (e.g., `test"inject.pdf`) would produce malformed or injected JSON in the audit log: `{"file":"test"inject.pdf"}`. Since the audit log is append-only and meant to be immutable/trustworthy, this corrupts audit data and could be exploited for log injection attacks.
**Fix:**
```java
// Replace manual JSON string building with proper escaping.
// Option 1: Use a JSON library
import com.fasterxml.jackson.databind.ObjectMapper;

// In the method:
String detail = objectMapper.writeValueAsString(Map.of("file", file.getOriginalFilename()));
auditLogService.log(userId, AuditAction.FILE_UPLOAD, "DOCUMENT", docId, detail);
```
This same issue exists at lines 172-173 (batch upload) and line 197 (download).

### CR-02: Server Trusts Client-Supplied MIME Type Without Validation

**File:** `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java:95`
**Issue:** The MIME type is taken directly from `file.getContentType()` which is controlled by the client. An attacker could upload an executable file renamed with a `.pdf` extension and a spoofed `Content-Type: application/pdf`. While the extension blocklist catches common dangerous extensions, MIME type spoofing combined with double-extension attacks (e.g., `report.pdf.exe` where only the last extension is checked -- this is actually handled correctly) or novel extensions not in the blocklist could bypass protections. The MIME type stored in the DB and returned via download response (`Content-Type` header in `DocumentController.java:177`) is whatever the client claimed, which could mislead downstream consumers.
**Fix:**
```java
// Validate MIME type against extension, or use a server-side MIME type detection library
// such as Apache Tika:
import org.apache.tika.Tika;

Tika tika = new Tika();
String detectedMimeType = tika.detect(file.getInputStream(), file.getOriginalFilename());
// Use detectedMimeType instead of file.getContentType()
```

## Warnings

### WR-01: Parameter Order Mismatch Between Controller and Service

**File:** `backend/src/main/java/com/micesign/controller/DocumentController.java:189`
**Issue:** The controller calls `attachmentService.deleteAttachment(user.getUserId(), attachmentId)` passing userId first, then attachmentId. But the service method signature at `DocumentAttachmentService.java:206` is `deleteAttachment(Long attachmentId, Long userId)` -- attachmentId first. This means the arguments are swapped: the userId is treated as the attachmentId and vice versa, which will cause incorrect authorization checks and 404 errors or, worse, deleting the wrong attachment.
**Fix:**
```java
// In DocumentController.java line 189, swap the arguments:
attachmentService.deleteAttachment(attachmentId, user.getUserId());
```

### WR-02: FileInputStream Resource Leak in GoogleDriveConfig

**File:** `backend/src/main/java/com/micesign/config/GoogleDriveConfig.java:57`
**Issue:** `new FileInputStream(credFile)` is opened but never explicitly closed. `GoogleCredentials.fromStream()` may not close the stream. This is a resource leak, though it only occurs once at startup so the impact is limited.
**Fix:**
```java
try (FileInputStream fis = new FileInputStream(credFile)) {
    GoogleCredentials creds = GoogleCredentials
            .fromStream(fis)
            .createScoped(SCOPES);
    log.info("Using service account key file: {}", credentialsPath);
    return creds;
}
```

### WR-03: Null-Safe Handling Missing for getOriginalFilename()

**File:** `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java:99`
**Issue:** `file.getOriginalFilename()` can return `null` per the `MultipartFile` contract. This null value is passed to `googleDriveService.uploadFile()` as the fileName, and also stored as `originalName` (which is a non-nullable DB column). This would cause a database constraint violation rather than a clear validation error.
**Fix:**
```java
// Add to validateFile() method:
String originalName = file.getOriginalFilename();
if (originalName == null || originalName.isBlank()) {
    throw new BusinessException("FILE_NAME_INVALID", "파일 이름이 없습니다.");
}
```

### WR-04: readOnly Prop Not Respected in Form Templates

**File:** `frontend/src/features/document/components/templates/GeneralForm.tsx:92`
**Issue:** When `readOnly` is true, the `FileAttachmentArea` component is still rendered with `readOnly={false}`. The same issue exists in `ExpenseForm.tsx:219` and `LeaveForm.tsx:254`. This means that in read-only view through these form components, the attachment area would show upload controls.
**Fix:**
```tsx
// Pass the readOnly prop through:
<FileAttachmentArea
  documentId={documentId}
  documentStatus="DRAFT"
  readOnly={readOnly}
/>
```

### WR-05: AttachmentResponse Record Missing gdriveFileId Field

**File:** `backend/src/main/java/com/micesign/dto/document/AttachmentResponse.java:5-13`
**Issue:** The `AttachmentResponse` record includes `gdriveFileId` which is the internal Google Drive file identifier. This is exposed to the frontend API response. While the frontend type definition at `document.ts:95-102` does not include this field (so it's silently ignored), exposing internal storage identifiers in the API response is an information leak that could aid an attacker in directly accessing the Drive API.
**Fix:**
```java
// Remove gdriveFileId from the response DTO:
public record AttachmentResponse(
    Long id,
    Long documentId,
    String originalName,
    Long fileSize,
    String mimeType,
    LocalDateTime createdAt
) {}

// Update the MapStruct mapper to ignore the field:
@Mapping(target = "gdriveFileId", ignore = true) // or simply remove from record
```

## Info

### IN-01: Hardcoded Korean Error Message in useFileUpload

**File:** `frontend/src/features/document/components/attachment/useFileUpload.ts:157`
**Issue:** The error message `'파일 업로드에 실패했습니다.'` is hardcoded in Korean rather than using the i18n translation key `attachment.error.uploadFailed` that is already defined in the locale files.
**Fix:**
```ts
// Use i18n translation (requires passing t function or using useTranslation in the hook)
error: t('attachment.error.uploadFailed')
```

### IN-02: Hardcoded Korean Text in Form Templates

**File:** `frontend/src/features/document/components/templates/GeneralForm.tsx:96`
**Issue:** The text `"문서를 저장한 후 파일을 첨부할 수 있습니다."` is hardcoded in Korean instead of using an i18n key. Same pattern exists in `ExpenseForm.tsx:223` and `LeaveForm.tsx:258`.
**Fix:** Add a translation key and use `t('attachment.saveFirst')` or similar.

### IN-03: Unused documentStatus Prop

**File:** `frontend/src/features/document/components/attachment/FileAttachmentArea.tsx:18-19`
**Issue:** The `documentStatus` prop is destructured as `_documentStatus` (prefixed with underscore indicating intentionally unused). The component accepts this prop but never uses it. If it is planned for future use, this is fine, but currently it adds unnecessary API surface.
**Fix:** Remove the prop if not needed, or add a comment indicating it is reserved for future use (e.g., restricting uploads to DRAFT-only status on the client side).

---

_Reviewed: 2026-04-08T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
