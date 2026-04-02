# Phase 5: File Attachments - Research

**Researched:** 2026-04-02
**Domain:** Google Drive API v3 integration, multipart file upload/download, file validation
**Confidence:** HIGH

## Summary

Phase 5 implements file attachment functionality for MiceSign documents: upload files to Google Drive via a Service Account, download with backend proxy (never exposing Drive IDs to the client), and validate file constraints (50MB/file, 10 files/doc, 200MB total, blacklisted extensions). The `document_attachment` DB table already exists from V1 migration but the `DocumentAttachment` JPA entity, repository, service, and controller endpoints must be created.

The backend requires two new Gradle dependencies: `google-api-services-drive` and `google-auth-library-oauth2-http` for Service Account authentication. The frontend needs a drag-and-drop file upload UI component replacing the existing placeholder sections in all three template forms and the detail page. No new database migration is needed since the table schema already exists.

**Primary recommendation:** Build a standalone `GoogleDriveService` that encapsulates all Drive API interactions (upload, download, delete, folder creation) with retry logic, then a `DocumentAttachmentService` that orchestrates validation + Drive operations + DB persistence. Frontend uses a reusable `FileAttachment` component shared across all template forms.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Drag-and-drop + button upload -- drop zone area with click-to-browse fallback
- **D-02:** Individual progress bars per file during upload
- **D-03:** Cumulative addition -- selecting new files adds to existing list, multiple file selection via `<input multiple>`
- **D-04:** Pre-selection blocking -- validate file size/extension/count at selection time, reject immediately
- **D-05:** Blacklist policy for extensions -- block .exe, .bat, .sh, .cmd, .msi, .ps1, .vbs, .js, .jar, .com only
- **D-06:** Always show usage status: "파일 3/10개, 45MB/200MB 사용 중"
- **D-07:** Limits: 50MB/file, 10 files/doc, 200MB total. Frontend first, backend final guard
- **D-08:** File icon + name + size display with chip/card layout
- **D-09:** X button without confirmation for delete in draft state. No delete for submitted documents
- **D-10:** Backend proxy download -- Drive file IDs never exposed to client
- **D-11:** Hide download buttons for unauthorized users. Authorization follows document-level access
- **D-12:** No bulk download in MVP -- individual file download only

### Claude's Discretion
- Backend Google Drive service implementation details (retry logic, error handling, folder creation strategy)
- Frontend component structure for attachment area
- Upload chunking or streaming strategy for large files

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILE-01 | User can upload files to Google Drive via Service Account when attaching to a document | Google Drive API v3 + Service Account auth library; `GoogleDriveService` with retry; multipart endpoint on backend; drag-and-drop frontend component |
| FILE-02 | User can download attachments with access control verification (only authorized viewers) | Backend proxy download streaming from Drive; document-level access check; Content-Disposition header for filename |
| FILE-03 | System validates file uploads: max 50MB/file, 10 files/doc, 200MB total, allowed/blocked extensions | Frontend pre-validation at selection time; backend validation in service layer; Spring multipart config for 50MB limit |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| google-api-services-drive | v3-rev20260220-2.0.0 | Google Drive API v3 Java client | Official Google client library for Drive operations |
| google-auth-library-oauth2-http | 1.43.0 | Service Account authentication | Official Google auth library for credential management |
| Spring Boot Multipart | (included in spring-boot-starter-web) | File upload handling | Built-in multipart support, no extra dependency needed |

### Frontend (already installed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| axios | 1.14.0 | HTTP client with upload progress | Already installed; supports `onUploadProgress` for progress bars |
| lucide-react | 1.7.0 | File type icons | Already installed; has FileText, Image, Archive, File icons |
| react-hook-form | 7.72.0 | Form integration | Already installed; attachment component integrates alongside existing forms |

### Not Needed

| Library | Why Not |
|---------|---------|
| react-dropzone | Native HTML5 drag-and-drop API is sufficient for this use case. The component is simple enough (drop zone + input) that a library adds unnecessary dependency |
| tus-js-client / resumable.js | Files max 50MB; standard multipart upload is fine. No need for chunked/resumable upload protocols |
| multer / busboy | Spring Boot's built-in multipart handling covers this; these are Node.js libraries |

**Backend Gradle additions:**
```kotlin
// Google Drive API v3
implementation("com.google.apis:google-api-services-drive:v3-rev20260220-2.0.0")
implementation("com.google.auth:google-auth-library-oauth2-http:1.43.0")
```

## Architecture Patterns

### Recommended Project Structure

```
backend/src/main/java/com/micesign/
  config/
    GoogleDriveConfig.java         # Drive client bean configuration
  service/
    GoogleDriveService.java        # Low-level Drive API wrapper (upload/download/delete/folder)
    DocumentAttachmentService.java # Business logic: validation + Drive + DB orchestration
  domain/
    DocumentAttachment.java        # JPA entity for document_attachment table
  repository/
    DocumentAttachmentRepository.java
  dto/document/
    AttachmentResponse.java        # Response DTO for attachment metadata
  mapper/
    DocumentAttachmentMapper.java  # MapStruct mapper
  controller/
    DocumentController.java        # Add attachment endpoints (upload/download/delete)

frontend/src/features/document/
  components/
    attachment/
      FileDropZone.tsx             # Drag-and-drop + browse component
      FileItem.tsx                 # Individual file display (icon + name + size + actions)
      FileAttachmentArea.tsx       # Container: drop zone + file list + usage status
      useFileUpload.ts             # Upload logic hook (progress tracking, validation)
  api/
    attachmentApi.ts               # API calls for upload/download/delete
  hooks/
    useAttachments.ts              # TanStack Query hooks for attachment CRUD
```

### Pattern 1: Two-Layer Drive Service

**What:** Separate `GoogleDriveService` (pure Drive API operations) from `DocumentAttachmentService` (business logic).
**When to use:** Always -- keeps Drive API details isolated from document business rules.
**Why:** Testability (mock Drive service in unit tests), single responsibility, easier to swap storage backend later.

### Pattern 2: Backend Proxy Download (Streaming)

**What:** Backend fetches file bytes from Google Drive and streams to client via `StreamingResponseBody` or `InputStreamResource`.
**When to use:** Always per D-10 -- Drive file IDs must never reach the client.
**Example:**
```java
@GetMapping("/api/v1/attachments/{id}/download")
public ResponseEntity<InputStreamResource> downloadAttachment(
        @AuthenticationPrincipal CustomUserDetails user,
        @PathVariable Long id) {
    // 1. Load attachment metadata from DB
    // 2. Verify document-level access
    // 3. Fetch file stream from Google Drive
    // 4. Return with Content-Disposition and correct MIME type
    InputStream stream = googleDriveService.downloadFile(attachment.getGdriveFileId());
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(attachment.getMimeType()))
        .contentLength(attachment.getFileSize())
        .header(HttpHeaders.CONTENT_DISPOSITION, 
            "attachment; filename=\"" + attachment.getOriginalName() + "\"")
        .body(new InputStreamResource(stream));
}
```

### Pattern 3: Multipart Upload with Progress

**What:** Frontend sends files as `multipart/form-data`; tracks upload progress via Axios `onUploadProgress`.
**Example (frontend):**
```typescript
const uploadFile = async (documentId: number, file: File, onProgress: (pct: number) => void) => {
  const formData = new FormData();
  formData.append('files', file);
  
  return apiClient.post(`/documents/${documentId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
};
```

### Pattern 4: Retry with Exponential Backoff (Google Drive)

**What:** Wrap Drive API calls with retry logic (max 3 attempts, 1s/2s/4s backoff) per PRD section 8.3.
**When to use:** All Drive API calls (upload, download, delete).
**Example:**
```java
private <T> T executeWithRetry(Callable<T> action, String operationName) {
    int maxRetries = 3;
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return action.call();
        } catch (GoogleJsonResponseException | IOException e) {
            if (attempt == maxRetries) throw new BusinessException("FILE_DRIVE_ERROR", "...");
            try { Thread.sleep((long) Math.pow(2, attempt - 1) * 1000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
        }
    }
    throw new BusinessException("FILE_DRIVE_ERROR", "파일 서버 오류");
}
```

### Anti-Patterns to Avoid
- **Exposing Google Drive file IDs to frontend:** Security violation; backend proxy is mandatory (D-10)
- **Validating only on frontend:** Backend MUST validate as final guard (D-07). Frontend validation is UX improvement only
- **Uploading files synchronously inside document save transaction:** File upload to Drive should be a separate API call, not part of the document create/update transaction. Upload failures should not roll back document saves
- **Storing file bytes in DB:** Only metadata goes in `document_attachment`; actual files in Google Drive

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Google Drive authentication | Custom OAuth flow | `GoogleCredentials.fromStream()` with Service Account JSON | Handles token refresh, scoping automatically |
| File MIME type detection | Extension-based guessing | `Files.probeContentType()` + fallback to `application/octet-stream` | More reliable; handles edge cases |
| Multipart parsing | Manual stream parsing | Spring Boot `@RequestParam("files") MultipartFile[]` | Built-in, handles temp file cleanup |
| Upload progress tracking | Custom XHR wrapper | Axios `onUploadProgress` callback | Already using Axios; native support |
| File type icons | Custom icon set | `lucide-react` icons (FileText, Image, FileArchive, File) | Already installed in project |

## Common Pitfalls

### Pitfall 1: Spring Boot Multipart Default Limits
**What goes wrong:** Spring Boot defaults to 1MB max file size and 10MB max request size. 50MB uploads fail silently or with cryptic `MaxUploadSizeExceededException`.
**Why it happens:** Developers forget to configure multipart limits.
**How to avoid:** Add to `application.yml`:
```yaml
spring:
  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 250MB  # 200MB total + overhead
```
**Warning signs:** `413 Payload Too Large` or `MaxUploadSizeExceededException` in logs.

### Pitfall 2: Google Drive Service Account Folder Ownership
**What goes wrong:** Service Account creates files/folders that are not visible in any user's Drive UI. Files appear "orphaned."
**Why it happens:** Service Account has its own Drive storage. Files are not shared with any human account by default.
**How to avoid:** Either (a) create files inside a shared folder that was previously shared with the Service Account, or (b) share a root folder to a human admin account for visibility. For MiceSign, option (b) is recommended -- share the `MiceSign/` root folder with a designated admin email.
**Warning signs:** Files upload successfully but admin cannot find them in Drive UI.

### Pitfall 3: Google Drive Folder Creation Race Condition
**What goes wrong:** Two concurrent uploads for the same document both try to create the same folder, resulting in duplicates.
**Why it happens:** No atomicity guarantee on Drive folder creation.
**How to avoid:** Check folder existence before creating; use synchronization or a "create-if-not-exists" pattern with the folder name as a unique key. Alternatively, create folder eagerly when the document is created (not at upload time).
**Warning signs:** Duplicate folders in Drive with same name.

### Pitfall 4: Content-Disposition Filename Encoding
**What goes wrong:** Korean filenames in download response headers get garbled.
**Why it happens:** HTTP headers are ASCII-only; non-ASCII filenames need RFC 5987 encoding.
**How to avoid:** Use both `filename` (ASCII fallback) and `filename*=UTF-8''...` (encoded):
```java
String encodedName = URLEncoder.encode(originalName, StandardCharsets.UTF_8).replace("+", "%20");
header("Content-Disposition", "attachment; filename=\"" + asciiName + "\"; filename*=UTF-8''" + encodedName)
```
**Warning signs:** Downloaded files have garbled names in Korean Windows/macOS environments.

### Pitfall 5: Frontend File Object Lifecycle
**What goes wrong:** File objects from `<input>` become invalid if the input is cleared or the component remounts.
**Why it happens:** Browser File API objects reference the original input element.
**How to avoid:** Read files into state immediately upon selection. Do not rely on the input element persisting. Use a React ref or state array to hold File objects.
**Warning signs:** Upload fails with empty body after navigating away and back.

### Pitfall 6: Draft Document Folder Path vs Submitted Path
**What goes wrong:** PRD specifies folder structure `MiceSign/{year}/{month}/{docNumber}/` but drafts don't have document numbers yet.
**Why it happens:** Document numbering happens at submission (Phase 6).
**How to avoid:** Use `MiceSign/drafts/DRAFT-{docId}/` for draft documents as noted in CONTEXT.md. The folder path stored in `gdrive_folder` column records where the file actually lives. Phase 6 can optionally update the DB path when the document is submitted, without moving files in Drive (simpler approach).
**Warning signs:** Files uploaded to drafts can't be found after submission.

## Code Examples

### Google Drive Service Account Setup
```java
// GoogleDriveConfig.java
@Configuration
public class GoogleDriveConfig {
    
    @Value("${google.drive.credentials-path}")
    private String credentialsPath;
    
    @Bean
    public Drive googleDriveClient() throws IOException {
        GoogleCredentials credentials = GoogleCredentials
            .fromStream(new FileInputStream(credentialsPath))
            .createScoped(Collections.singletonList(DriveScopes.DRIVE_FILE));
        
        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);
        
        return new Drive.Builder(
            GoogleNetHttpTransport.newTrustedTransport(),
            GsonFactory.getDefaultInstance(),
            requestInitializer)
            .setApplicationName("MiceSign")
            .build();
    }
}
```

### File Upload Endpoint
```java
// In DocumentController.java
@PostMapping("/{docId}/attachments")
public ResponseEntity<ApiResponse<List<AttachmentResponse>>> uploadAttachments(
        @AuthenticationPrincipal CustomUserDetails user,
        @PathVariable Long docId,
        @RequestParam("files") MultipartFile[] files) {
    List<AttachmentResponse> responses = attachmentService.uploadFiles(user.getUserId(), docId, files);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(responses));
}
```

### Frontend File Validation (Pre-selection)
```typescript
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'sh', 'cmd', 'msi', 'ps1', 'vbs', 'js', 'jar', 'com'
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB

function validateFile(file: File, existingFiles: AttachmentInfo[]): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (BLOCKED_EXTENSIONS.has(ext)) return `허용되지 않는 파일 형식입니다: .${ext}`;
  if (file.size > MAX_FILE_SIZE) return `파일 크기가 50MB를 초과합니다: ${file.name}`;
  
  const currentTotal = existingFiles.reduce((sum, f) => sum + f.fileSize, 0);
  if (currentTotal + file.size > MAX_TOTAL_SIZE) return '문서당 첨부파일 총 용량은 200MB를 초과할 수 없습니다';
  if (existingFiles.length >= MAX_FILES) return '문서당 첨부파일은 최대 10개입니다';
  
  return null; // valid
}
```

### Drag-and-Drop Zone Pattern
```typescript
// FileDropZone.tsx - core structure
function FileDropZone({ onFilesSelected, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    onFilesSelected(files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn("border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300")}
    >
      <input ref={inputRef} type="file" multiple className="hidden"
        onChange={(e) => onFilesSelected(Array.from(e.target.files ?? []))} />
      {/* Icon + text */}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google API Client v1.x (google-http-client) | Google API Client v2.x (GsonFactory, HttpCredentialsAdapter) | 2023 | Must use v2.x API patterns; v1.x `JacksonFactory` is deprecated |
| `GoogleCredential` (deprecated) | `GoogleCredentials` from google-auth-library | 2022 | Use `google-auth-library-oauth2-http` for Service Account auth |
| `DriveScopes.DRIVE` (full access) | `DriveScopes.DRIVE_FILE` (app-created files only) | Best practice | Minimize scope: DRIVE_FILE only accesses files created by the app |

## Open Questions

1. **Service Account JSON key file location on dev machine**
   - What we know: PRD says "환경변수로 경로 지정, Git 추적 제외"
   - What's unclear: Whether the Service Account JSON file is already available or needs to be created in Google Cloud Console
   - Recommendation: Add `google.drive.credentials-path` to application.yml with env var fallback; add the JSON path to .gitignore. For testing, mock the Drive service entirely (no real API calls in tests)

2. **Folder path strategy for drafts**
   - What we know: FSD says `MiceSign/{year}/{month}/DRAFT-{docId}/`; CONTEXT.md says temporary folder for drafts
   - What's unclear: Whether to move files when document is submitted (Phase 6) or just update DB path
   - Recommendation: Store files in `MiceSign/drafts/DRAFT-{docId}/` and do NOT move them on submission. Just update `gdrive_folder` in DB to record the logical path. Moving files in Drive is an unnecessary API call and risk

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java 17 | Backend build | via JAVA_HOME | 17 (system has 24) | Use JAVA_HOME per Phase 1 decision |
| MariaDB | Database | remote at 10.211.55.21:3306 | 10.11+ | -- |
| Google Drive API | FILE-01, FILE-02 | Requires Service Account JSON key | v3 | Mock in tests |
| Google Cloud Service Account | FILE-01 | Unknown -- key file must exist on server | -- | Cannot proceed without key; mock for dev |

**Missing dependencies with no fallback:**
- Google Service Account JSON key file: Must be provisioned before real file operations work. Development can proceed with a mock `GoogleDriveService`.

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test (backend), no frontend test framework yet |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew test --tests "com.micesign.document.*"` |
| Full suite command | `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILE-01 | Upload files, store in Drive, save metadata to DB | integration | `./gradlew test --tests "com.micesign.document.AttachmentControllerTest.upload*"` | Wave 0 |
| FILE-01 | Google Drive service upload with retry | unit | `./gradlew test --tests "com.micesign.document.GoogleDriveServiceTest"` | Wave 0 |
| FILE-02 | Download file via proxy with access control | integration | `./gradlew test --tests "com.micesign.document.AttachmentControllerTest.download*"` | Wave 0 |
| FILE-03 | Reject oversized files (50MB limit) | integration | `./gradlew test --tests "com.micesign.document.AttachmentControllerTest.upload*SizeExceeded*"` | Wave 0 |
| FILE-03 | Reject blocked extensions | integration | `./gradlew test --tests "com.micesign.document.AttachmentControllerTest.upload*BlockedExtension*"` | Wave 0 |
| FILE-03 | Reject when file count exceeds 10 | integration | `./gradlew test --tests "com.micesign.document.AttachmentControllerTest.upload*CountExceeded*"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `./gradlew test --tests "com.micesign.document.*" -x`
- **Per wave merge:** `./gradlew test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/document/AttachmentControllerTest.java` -- covers FILE-01, FILE-02, FILE-03 integration tests
- [ ] `backend/src/test/java/com/micesign/document/GoogleDriveServiceTest.java` -- unit tests with mocked Drive client
- [ ] `backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java` -- validation logic unit tests
- [ ] Mock `GoogleDriveService` bean for integration tests (H2 cannot interact with real Drive API)

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Spring Boot 3.x (currently 3.5.13), Java 17, React 18, TypeScript, Zustand, TanStack Query v5, TailwindCSS
- **Auth:** JWT stateless; all new endpoints must be authenticated (existing SecurityConfig handles this)
- **DB:** MariaDB 10.11+ with utf8mb4; H2 MariaDB mode for tests with Flyway test migrations
- **File storage:** Google Drive API v3 with Service Account; metadata only in DB
- **Form templates:** Hardcoded React components -- attachment UI is a shared component used by all templates
- **Must use:** MapStruct for DTO mapping, Flyway for any new migrations (none needed for table, but may need for config), Axios with interceptors for API calls
- **Must NOT use:** Lombok, Docker, Spring WebFlux
- **Patterns:** BusinessException for error handling, ApiResponse wrapper, JdbcTemplate @BeforeEach cleanup in tests, TestTokenHelper for auth in tests

## Sources

### Primary (HIGH confidence)
- PRD Section 8 (File Storage) -- upload limits, folder structure, retry policy, Service Account requirements
- FSD Section 7 (FN-FILE) -- API contracts for upload/download/delete, validation rules, error codes
- Existing codebase -- `document_attachment` table DDL in V1 migration, DocumentController patterns, test infrastructure

### Secondary (MEDIUM confidence)
- [Maven Repository: google-api-services-drive](https://mvnrepository.com/artifact/com.google.apis/google-api-services-drive) -- verified version v3-rev20260220-2.0.0
- [Maven Repository: google-auth-library-oauth2-http](https://mvnrepository.com/artifact/com.google.auth/google-auth-library-oauth2-http) -- verified version 1.43.0
- [Spring Boot Multipart Configuration](https://www.javathinking.com/blog/max-limit-of-multipartfile-in-spring-boot/) -- multipart properties and defaults
- [Google Drive API Official Docs](https://developers.google.com/workspace/drive/api/guides/downloads) -- client library installation

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- official Google libraries, well-documented; versions verified on Maven Central
- Architecture: HIGH -- follows existing project patterns (controller/service/repository/mapper); Drive integration is standard
- Pitfalls: HIGH -- well-known issues (multipart limits, Service Account visibility, filename encoding) documented across multiple sources

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable domain; Google Drive API v3 is mature)
