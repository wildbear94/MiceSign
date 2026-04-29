# Phase 34: 양식 기안자 정보 헤더 자동 채움 - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 23 (BE 5 + FE 18, including locale)
**Analogs found:** 22 / 23 (single-cell label/value display, snapshot capture, props plumbing, registry SoT, integration tests, component tests, auth user serialization, i18n key tree)
**Source authorities:** `34-CONTEXT.md` (decisions), `34-RESEARCH.md` (Files to Modify + line numbers), `34-UI-SPEC.md` (visual contract), live codebase reads.

> **Planner note:** RESEARCH.md already enumerates each file with line ranges; this document is the **planner-ready inline-excerpts** layer on top of it. Every excerpt below is taken verbatim from a real file in the repo; the planner can copy them into PLAN action sections without re-drilling.

---

## Canonical Analogs (anchor map)

The 14 form integration points all follow the **same** prototype. Identify the prototype once, apply to the rest.

| Family | Prototype (canonical analog) | Variants |
|--------|------------------------------|----------|
| Built-in Edit (×6) | **`templates/GeneralForm.tsx`** | ExpenseForm / LeaveForm / PurchaseForm / BusinessTripForm / OvertimeForm — all consume `TemplateEditProps`, all render `<form id="document-form" ... className="space-y-4">` as the root. ExpenseForm verified L17 (same prop signature), L60 (`<form id="document-form" ...>`). |
| Built-in ReadOnly (×6) | **`templates/GeneralReadOnly.tsx`** + label/value SoT in **`pages/DocumentDetailPage.tsx` L216~245** | ExpenseReadOnly / LeaveReadOnly / PurchaseReadOnly / BusinessTripReadOnly / OvertimeReadOnly — all consume `TemplateReadOnlyProps`, all render a flat `<div>` root. |
| Dynamic Edit (×1) | **`dynamic/DynamicCustomForm.tsx`** | Same `TemplateEditProps`, but uses `FormProvider` + `<form id="document-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">` (L209~213). Header insertion point = first child of `<form>`. |
| Dynamic ReadOnly (×1) | **`dynamic/DynamicCustomReadOnly.tsx`** | Same `TemplateReadOnlyProps`, root is `<div>` (or `<div className="p-4">` per error path). Header insertion point = first child of root. |
| Label/value visual SoT | **`pages/DocumentDetailPage.tsx` L216~245** | EXACT class strings (`grid grid-cols-2 md:grid-cols-4 gap-3`, `text-gray-500 dark:text-gray-400 block mb-0.5`, `text-gray-900 dark:text-gray-50`) inherited by `DrafterInfoHeader.tsx`. |
| Snapshot label/value cell layout | `DocumentDetailPage.tsx` L217~219 (`양식` cell) | Single existing cell already proves the cell anatomy: `<div><span className="text-gray-500 ... block mb-0.5">{label}</span><span className="text-gray-900 ...">{value}</span></div>`. UI-SPEC mandates `<dl>/<dt>/<dd>` for the new header but **inherits the same Tailwind classes verbatim**. |
| BE submit-time mutation point | `DocumentService.submitDocument()` L264~338, audit-log block L314~319 | Existing audit serialization at L315 `objectMapper.writeValueAsString(Map.of(...))` is the canonical Jackson write pattern in this exact method. |
| BE drafter null-safe extraction | `DocumentMapper.java` L21~24 + L33~36 (MapStruct expressions) | `document.getDrafter() != null && document.getDrafter().getDepartment() != null ? document.getDrafter().getDepartment().getName() : null` — used in 4+ services per RESEARCH Pattern 2. |
| BE integration test | `DocumentSubmitTest.java` (entire file, 323 lines) | `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")` + `JdbcTemplate` cleanup + `tokenHelper.superAdminToken()` + `MvcResult` JSON assertion. The ONLY backend test pattern in this package (17/17 tests use it). |
| FE component test | `__tests__/DrafterCombo.test.tsx` (66 lines) | `vitest` + `@testing-library/react` + `vi.mock(...)` for module mocking. Only existing component test in `document/components/__tests__/`. |
| BE auth user-profile builder | `AuthService.java` L263~272 (`buildUserProfile(User user)`) | Single private factory method called from both login (L131) AND refresh (L196). Adding 2 fields = 2-line edit in this method + 2-field add in `UserProfileDto.java`. |

---

## File Classification

### Backend (BE)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `backend/src/main/java/com/micesign/service/DocumentService.java` (modify L296+) | service / state-transition + JSON write | request-response (txn-bound) | itself L314~319 (audit-log JSON write) | **exact** (same method, same ObjectMapper instance L60) |
| `backend/src/main/java/com/micesign/service/AuthService.java` (modify L263~272) | service / DTO assembly | request-response | itself L263~272 (`buildUserProfile`) | **exact** (1 method extension, no flow change) |
| `backend/src/main/java/com/micesign/dto/auth/UserProfileDto.java` (modify) | DTO record | data-transfer | itself (record extension) | **exact** (add 2 fields to record) |
| `backend/src/main/java/com/micesign/dto/auth/LoginResponse.java` / `RefreshResponse.java` | DTO record | data-transfer | (no change — both wrap `UserProfileDto`) | **n/a** (transitively updated) |
| `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` (extend) | integration test | request-response | itself L82~94 (`submitDraft_success`) + L266~297 (helpers) | **exact** (add ~80 lines following existing pattern) |

### Frontend (FE) — new files

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `frontend/src/features/document/components/DrafterInfoHeader.tsx` (NEW) | presentational component | props-only (no async, no hooks beyond `useTranslation`) | `DocumentDetailPage.tsx` L216~245 (label/value grid) | **exact for visual contract**; component is composition-only (props in, JSX out) |
| `frontend/src/features/document/components/__tests__/DrafterInfoHeader.test.tsx` (NEW) | component test | unit | `__tests__/DrafterCombo.test.tsx` | **exact for harness**; differs only in lack of API mock (header has no API calls) |

### Frontend (FE) — type / infra modifications

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `frontend/src/features/document/types/document.ts` (modify L22~37 — D-G1) | type definition | data-transfer | `DocumentDetailResponse.java` (BE record, L13~16) | **exact** — FE type aligns to BE record |
| `frontend/src/types/auth.ts` (modify L1~8 — D-F1) | type definition | data-transfer | `UserProfileDto.java` (BE record) | **exact** — FE type aligns to BE record |
| `frontend/src/stores/authStore.ts` | Zustand store | client-state | itself (no shape change — only type re-import) | **n/a** (UserProfile is sourced via `import type` so the store is transitively updated) |
| `frontend/src/features/document/components/templates/templateRegistry.ts` (modify L17~36) | type registry / SoT | type-extension | itself (entire file is the SoT) | **exact** — extending the ONLY props contract that 14 components share |
| `frontend/src/features/document/pages/DocumentEditorPage.tsx` (modify L315~330) | page composition | props-drilling | itself L315~330 (existing initialData spread) | **exact** — same pattern, add `drafterLive` prop |
| `frontend/src/features/document/pages/DocumentDetailPage.tsx` (modify L226~229 + L250~256) | page composition | props-drilling + bug fix | itself (latent-bug fix uses `doc.drafterName` flat field which already exists in BE) | **exact** — same call site, replace `.drafter.name` → `.drafterName` |
| `frontend/public/locales/ko/document.json` (extend) | i18n resource | static-resource | itself (existing tree under `templateModal.*`, `error.*`) | **exact** — add new top-level `drafterInfo.*` subtree |

### Frontend (FE) — form integration (12 callsite changes — same edit at every site)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `templates/GeneralForm.tsx` L50 (after `<form>` tag) | form integration | props-in | itself (prototype) | **exact** |
| `templates/ExpenseForm.tsx`, `LeaveForm.tsx`, `PurchaseForm.tsx`, `BusinessTripForm.tsx`, `OvertimeForm.tsx` | form integration | props-in | `GeneralForm.tsx` | **exact** (same one-line insertion) |
| `dynamic/DynamicCustomForm.tsx` L210 (inside `<form>` block, before `<div className="mb-4">` title block at L214) | form integration | props-in | `GeneralForm.tsx` | **exact** |
| `templates/GeneralReadOnly.tsx`, ExpenseReadOnly, LeaveReadOnly, PurchaseReadOnly, BusinessTripReadOnly, OvertimeReadOnly (all 6 ReadOnly) | view integration | props-in | `GeneralReadOnly.tsx` | **exact** (insert `<DrafterInfoHeader mode="submitted" ... />` as first child of root `<div>`) |
| `dynamic/DynamicCustomReadOnly.tsx` (root `<div>` first child) | view integration | props-in | `GeneralReadOnly.tsx` | **exact** |

---

## Pattern Assignments

### 1. `DocumentService.java` — snapshot capture (BE)

**Analog:** Itself, lines L314~319 (existing audit-log JSON write inside the same `submitDocument()` method) + DocumentMapper L21~24 (drafter null-safe pattern).

**Imports pattern** (already present, no new imports needed):
- `objectMapper` — `private static final ObjectMapper objectMapper = new ObjectMapper();` (L60). REUSE.
- Already imported: `com.fasterxml.jackson.core.JsonProcessingException`, `java.util.Map`, `java.time.LocalDateTime`, domain `User`/`Document`/`DocumentContent`.
- NEW imports needed for snapshot block: `java.util.LinkedHashMap`, `com.fasterxml.jackson.core.type.TypeReference`.

**Existing `objectMapper.writeValueAsString(Map.of(...))` pattern in same method (L314~319):**
```java
try {
    String submitDetail = objectMapper.writeValueAsString(Map.of("docNumber", docNumber));
    auditLogService.log(userId, AuditAction.DOC_SUBMIT, "DOCUMENT", docId, submitDetail);
} catch (JsonProcessingException e) {
    log.warn("Failed to serialize audit detail for DOC_SUBMIT: {}", e.getMessage());
    auditLogService.log(userId, AuditAction.DOC_SUBMIT, "DOCUMENT", docId);
}
```
This is the **direct prototype** for the new snapshot block — same try/catch, same `objectMapper`, same method scope. **HOWEVER** Phase 34 D-C7 (Q2=A) overrides the swallow-and-warn behavior: snapshot serialization failure must throw and roll back the txn. Concrete adaptation:

**Insertion point:** L296 (immediately after `document.setSubmittedAt(LocalDateTime.now());`), BEFORE `documentRepository.save(document);` at L309.

**Drafter null-safe extraction (mirrors `DocumentMapper` L22~23):**
```java
User drafter = document.getDrafter();
String departmentName = drafter.getDepartment() != null
        ? drafter.getDepartment().getName() : null;
String positionName = drafter.getPosition() != null
        ? drafter.getPosition().getName() : null;
```
The `drafter.getDepartment()` LAZY proxy is safe here — class-level `@Transactional` (L56) is active.

**Snapshot merge block (D-C7 = throw on failure):**
```java
// Phase 34: drafter snapshot 박제 (D-C1, D-C2, D-A3)
// content 변수는 L286~287 에서 이미 로드됨 — 재사용
try {
    java.util.Map<String, Object> body;
    String currentFormData = content.getFormData();
    if (currentFormData == null || currentFormData.isBlank()) {
        body = new java.util.LinkedHashMap<>();
    } else {
        body = objectMapper.readValue(
                currentFormData,
                new com.fasterxml.jackson.core.type.TypeReference<java.util.LinkedHashMap<String, Object>>() {});
    }
    java.util.Map<String, Object> snapshot = new java.util.LinkedHashMap<>();
    snapshot.put("departmentName", departmentName);
    snapshot.put("positionName", positionName);  // null 허용 (D-C4)
    snapshot.put("drafterName", drafter.getName());
    snapshot.put("draftedAt", document.getSubmittedAt().toString()); // ISO LocalDateTime
    body.put("drafterSnapshot", snapshot);
    content.setFormData(objectMapper.writeValueAsString(body));
    documentContentRepository.save(content);
} catch (JsonProcessingException e) {
    // D-C7 (Q2=A): 트랜잭션 전체 롤백 — submit 흐름 차단
    log.error("Failed to serialize drafterSnapshot for document {}: {}",
            document.getId(), e.getMessage());
    throw new RuntimeException("DOC_SNAPSHOT_FAILED", e);
}
```

**Why this pattern is exact:** Same try/catch shape as L314~319, same `objectMapper`, same method, same txn boundary. Only difference is `throw` vs swallow per D-C7.

---

### 2. `AuthService.buildUserProfile()` — UserProfileDto extension (BE, D-F1/D-F2)

**Analog:** Itself, L263~272 (existing private factory).

**Existing code (verbatim, L263~272):**
```java
private UserProfileDto buildUserProfile(User user) {
    return new UserProfileDto(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole().name(),
            user.getDepartmentId(),
            user.isMustChangePassword()
    );
}
```

**Phase 34 modification — copy DocumentMapper L22~23 null-safe pattern:**
```java
private UserProfileDto buildUserProfile(User user) {
    String departmentName = user.getDepartment() != null
            ? user.getDepartment().getName() : null;
    String positionName = user.getPosition() != null
            ? user.getPosition().getName() : null;
    return new UserProfileDto(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole().name(),
            user.getDepartmentId(),
            user.isMustChangePassword(),
            departmentName,            // NEW (D-F1/D-F2)
            positionName               // NEW (D-F1/D-F2)
    );
}
```

**Companion record edit — `UserProfileDto.java`:**
Existing (L1~11):
```java
public record UserProfileDto(
        Long id,
        String name,
        String email,
        String role,
        Long departmentId,
        boolean mustChangePassword
) {}
```
After Phase 34:
```java
public record UserProfileDto(
        Long id,
        String name,
        String email,
        String role,
        Long departmentId,
        boolean mustChangePassword,
        String departmentName,      // NEW (D-F1/D-F2) — nullable (orphan-user safety)
        String positionName         // NEW (D-F1/D-F2) — nullable (User.positionId nullable)
) {}
```

**Note:** `LoginResponse.java` and `RefreshResponse.java` both wrap `UserProfileDto` (verified) — they require **NO modification**. The 2-field add propagates transitively.

**LAZY safety:** `AuthService.buildUserProfile` is called inside `login()` and `refreshToken()` — both are inside Spring Security's request flow, but the call paths run within the auth controller's request scope. Verify the User entity is loaded eagerly OR the call happens within a `@Transactional` method. RESEARCH did not flag a LAZY problem here, but planner should confirm by reading L72~131 of `AuthService.java`. Mitigation if LAZY blows up: add `@Transactional(readOnly = true)` to the method or use `Hibernate.initialize(user.getDepartment())`. **PROTECTIVE GUARD: keep null-safe access — orphan users with deleted departments must still log in.**

---

### 3. `DocumentSubmitTest.java` — integration test extension (BE, D-E1)

**Analog:** Itself, entire file (323 lines), specifically:
- L52~75 (`@BeforeEach setUp()`) — DB cleanup + APPROVER user insert + token grab
- L82~94 (`submitDraft_success`) — basic submit-and-assert pattern
- L266~297 (`createGeneralDraft`, `createExpenseDraft` helpers)
- L299~304 (`addApprovalLine` helper)

**Test class header pattern (already in file, copy as-is for new tests):**
```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentSubmitTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;
    private String token;
    private int currentYear;
    private static final Long APPROVER_ID = 60L;
```

**Authentication mock pattern (L72~74):**
```java
// Use super admin (userId=1) which is seeded in V2
token = tokenHelper.superAdminToken();
currentYear = LocalDateTime.now().getYear();
```

**Existing assert-form_data pattern adapted from `submitGeneralDocument_numberFormatGEN` (L100~113):**
```java
MvcResult result = mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
        .header("Authorization", "Bearer " + token))
    .andExpect(status().isOk())
    .andReturn();

String docNumber = objectMapper.readTree(result.getResponse().getContentAsString())
        .path("data").path("docNumber").asText();
```

**Phase 34 NEW test methods (apply same pattern, navigate to formData):**
```java
@Test
void submitDraft_capturesDrafterSnapshot() throws Exception {
    // SUPER_ADMIN seeded in V2 — has department + position assigned (verify in V2 seed)
    Long docId = createGeneralDraft("snapshot 캡처 테스트");
    addApprovalLine(docId);

    MvcResult result = mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();

    // formData JSON from response — DocumentDetailResponse.formData is the raw String
    String formDataJson = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("formData").asText();
    com.fasterxml.jackson.databind.JsonNode snapshot = objectMapper.readTree(formDataJson)
            .path("drafterSnapshot");

    org.junit.jupiter.api.Assertions.assertFalse(snapshot.isMissingNode(),
            "drafterSnapshot must be present after submit");
    org.junit.jupiter.api.Assertions.assertNotNull(snapshot.path("departmentName").asText(null));
    org.junit.jupiter.api.Assertions.assertNotNull(snapshot.path("drafterName").asText(null));
    org.junit.jupiter.api.Assertions.assertNotNull(snapshot.path("draftedAt").asText(null));
}

@Test
void submitDraft_capturesDrafterSnapshot_nullPosition() throws Exception {
    // Insert a user with NULL position_id, create doc as that user, submit
    Long noPositionUserId = 80L;
    jdbcTemplate.update("DELETE FROM \"user\" WHERE id = ?", noPositionUserId);
    jdbcTemplate.update(
            "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
                    "VALUES (?, 'NOPOS', '직위없음테스터', 'nopos@micesign.com', '$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW', 2, NULL, 'USER', 'ACTIVE', 0, FALSE)",
            noPositionUserId);
    String noPositionToken = tokenHelper.tokenFor(noPositionUserId); // verify exact API on TestTokenHelper

    Long docId = createGeneralDraftAs("직위 null 케이스", noPositionToken);
    addApprovalLineFor(docId, /* approverId */ APPROVER_ID);

    MvcResult result = mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
            .header("Authorization", "Bearer " + noPositionToken))
        .andExpect(status().isOk())
        .andReturn();

    String formDataJson = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("formData").asText();
    com.fasterxml.jackson.databind.JsonNode snapshot = objectMapper.readTree(formDataJson)
            .path("drafterSnapshot");

    // D-C4 — positionName must be JSON null (key present, value null), NOT omitted
    org.junit.jupiter.api.Assertions.assertTrue(snapshot.has("positionName"),
            "positionName key must be present even when null (D-C4 — JSON null per document/* convention)");
    org.junit.jupiter.api.Assertions.assertTrue(snapshot.path("positionName").isNull());
}
```

**Note:** `createGeneralDraftAs(title, token)` and `addApprovalLineFor(docId, approverId)` are helper variants the planner must add (the existing `createGeneralDraft(String)` and `addApprovalLine(Long)` use the captured `token` and `APPROVER_ID` constants — the null-position test uses a different drafter user, so a token-parameterized helper is needed). Pattern source: lines 266~304.

**Verify `tokenHelper.tokenFor(Long userId)` API exists:** RESEARCH did not confirm this — planner Wave 0 first task should grep `TestTokenHelper.java` for available methods (`superAdminToken()`, `userToken()` are confirmed; a parameterized variant likely exists or must be added). If absent, alternative: insert the test user first, then call `/api/v1/auth/login` MockMvc to obtain a real JWT (slower but proven path).

---

### 4. `DrafterInfoHeader.tsx` — new component (FE, D-D1, UI-SPEC §Layout Contract)

**Analog:** `DocumentDetailPage.tsx` L216~245 (existing 4-column meta-grid with the EXACT classes UI-SPEC mandates).

**Imports pattern (from `GeneralForm.tsx` L1~8 + UI-SPEC §Component API):**
```tsx
import { useTranslation } from 'react-i18next';
```
That is the **only** import. No icons (UI-SPEC §"no icons — pure typography"), no shadcn/Radix, no Zustand.

**Visual SoT excerpt — `DocumentDetailPage.tsx` L216~245** (this is the layout the new header **mirrors verbatim** with `<dl>/<dt>/<dd>` semantic upgrade):
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
  <div>
    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">양식</span>
    <TemplateBadge templateCode={doc.templateCode} />
  </div>
  <div>
    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">상태</span>
    <DocumentStatusBadge status={doc.status} />
  </div>
  <div>
    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">기안자</span>
    <span className="text-gray-900 dark:text-gray-50">
      {doc.drafter.name} ({doc.drafter.departmentName})  {/* ← Pitfall 6: latent bug, fix per D-G2 */}
    </span>
  </div>
  <div>
    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">문서번호</span>
    <span className="text-gray-900 dark:text-gray-50">{doc.docNumber ?? '-'}</span>
  </div>
  ...
</div>
```

**Card wrapper SoT — `DocumentDetailPage.tsx` L249** (the new header reuses these classes for its outer `<dl>`):
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
```

**Date format SoT — `DocumentDetailPage.tsx` L125~133:**
```tsx
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```
**UI-SPEC mandates dropping `hour`/`minute`** (header field is `기안일`, not `기안 시각`). Inline copy of this formatter inside the component (no util extraction — Pattern 6 of RESEARCH).

**Concrete Phase 34 component (assembled from UI-SPEC §Layout Contract template):**
```tsx
import { useTranslation } from 'react-i18next';

export type DrafterSnapshot = {
  departmentName: string;
  positionName: string | null;
  drafterName: string;
  draftedAt: string; // ISO 8601
};

export type DrafterLive = {
  drafterName: string;
  departmentName: string;
  positionName: string | null;
};

export type DrafterInfoHeaderProps =
  | { mode: 'draft'; live: DrafterLive }
  | {
      mode: 'submitted';
      snapshot: DrafterSnapshot | null;  // null → legacy fallback
      live: DrafterLive;                  // always required
      submittedAt: string;                // used when snapshot null (legacy)
    };

function formatDraftedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function DrafterInfoHeader(props: DrafterInfoHeaderProps) {
  const { t } = useTranslation('document');

  // Resolve display values per UI-SPEC §"Props selection rule"
  const { departmentName, positionName, drafterName, dateText, showLegacyBadge } =
    props.mode === 'draft'
      ? {
          departmentName: props.live.departmentName,
          positionName: props.live.positionName,
          drafterName: props.live.drafterName,
          dateText: t('drafterInfo.draftedAtPlaceholder'),
          showLegacyBadge: false,
        }
      : props.snapshot !== null
        ? {
            departmentName: props.snapshot.departmentName,
            positionName: props.snapshot.positionName,
            drafterName: props.snapshot.drafterName,
            dateText: formatDraftedDate(props.snapshot.draftedAt),
            showLegacyBadge: false,
          }
        : {
            departmentName: props.live.departmentName,
            positionName: props.live.positionName,
            drafterName: props.live.drafterName,
            dateText: formatDraftedDate(props.submittedAt),
            showLegacyBadge: true,
          };

  return (
    <dl
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3"
      aria-label={t('drafterInfo.headerAriaLabel')}
    >
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
          {t('drafterInfo.departmentLabel')}
        </dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {departmentName}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
          {t('drafterInfo.positionLabel')}
        </dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {positionName ?? t('drafterInfo.emptyPosition')}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
          {t('drafterInfo.drafterLabel')}
        </dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {drafterName}
          {showLegacyBadge && (
            <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">
              {t('drafterInfo.currentInfoBadge')}
            </span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
          {t('drafterInfo.draftedAtLabel')}
        </dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {dateText}
        </dd>
      </div>
    </dl>
  );
}
```

---

### 5. `DrafterInfoHeader.test.tsx` — component test (FE, D-E2)

**Analog:** `__tests__/DrafterCombo.test.tsx` (66 lines).

**Imports + harness pattern (verbatim from DrafterCombo.test.tsx L1~3):**
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
```

**Module mock pattern (DrafterCombo.test.tsx L7~11) — ADAPT for `react-i18next`:**
```tsx
// DrafterInfoHeader uses useTranslation('document') — mock to return identity-stub
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key, // tests assert against key strings, not Korean copy
  }),
}));
```
This is the standard Phase 32 i18n test mock pattern (verified by `vi.mock(...)` style in DrafterCombo). The header has NO Zustand store dependency (RESEARCH Pattern 8 + UI-SPEC §"Component API Contract — pure, no hooks beyond useTranslation"), so **no authStore mock is needed** — the prompt asked about Zustand mocking but the actual component doesn't touch the store; props are pre-resolved by the parent page.

**3 test cases (D-E2):**
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DrafterInfoHeader from '../DrafterInfoHeader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('DrafterInfoHeader', () => {
  it('mode=draft — 부서/직위·직책/기안자 표시 + 기안일 = 플레이스홀더', () => {
    render(
      <DrafterInfoHeader
        mode="draft"
        live={{ drafterName: '홍길동', departmentName: '개발1팀', positionName: '팀장' }}
      />,
    );
    expect(screen.getByText('개발1팀')).toBeInTheDocument();
    expect(screen.getByText('팀장')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('drafterInfo.draftedAtPlaceholder')).toBeInTheDocument();
    expect(screen.queryByText('drafterInfo.currentInfoBadge')).not.toBeInTheDocument();
  });

  it('mode=submitted + snapshot 존재 — snapshot 4 필드 표시, 배지 없음', () => {
    render(
      <DrafterInfoHeader
        mode="submitted"
        snapshot={{
          departmentName: '경영지원팀',
          positionName: '대리',
          drafterName: '김철수',
          draftedAt: '2026-04-29T10:30:00',
        }}
        live={{ drafterName: 'IGNORED', departmentName: 'IGNORED', positionName: null }}
        submittedAt="2026-04-29T10:30:00"
      />,
    );
    expect(screen.getByText('경영지원팀')).toBeInTheDocument();
    expect(screen.getByText('대리')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.queryByText('drafterInfo.currentInfoBadge')).not.toBeInTheDocument();
    // Date format assertion — toLocaleDateString('ko-KR', y/m/d) → "2026. 04. 29."
    expect(screen.getByText(/2026\. 04\. 29\./)).toBeInTheDocument();
  });

  it('mode=submitted + snapshot=null (legacy) — live 4 필드 + (현재 정보) 배지', () => {
    render(
      <DrafterInfoHeader
        mode="submitted"
        snapshot={null}
        live={{ drafterName: '이영희', departmentName: '인사팀', positionName: null }}
        submittedAt="2026-04-29T10:30:00"
      />,
    );
    expect(screen.getByText('인사팀')).toBeInTheDocument();
    expect(screen.getByText('drafterInfo.emptyPosition')).toBeInTheDocument(); // positionName=null fallback
    expect(screen.getByText('이영희')).toBeInTheDocument();
    expect(screen.getByText('drafterInfo.currentInfoBadge')).toBeInTheDocument();
    expect(screen.getByText(/2026\. 04\. 29\./)).toBeInTheDocument();
  });
});
```

**Why the mock is i18n-only (no Zustand):** Per UI-SPEC §"Rendering invariants" the component is pure with `useTranslation('document')` as its only hook. RESEARCH Q1 originally hypothesized Zustand-mocking would be needed; but the chosen architecture (D-F1 expand UserProfile + parent extracts to `live` props) means the component itself never touches authStore. The parent pages (DocumentEditorPage, DocumentDetailPage) do, and those pages are NOT unit-tested in this phase (per D-E3, they're UAT'd manually).

---

### 6. `templateRegistry.ts` — props-shape extension (FE infra, D-D6)

**Analog:** Itself, L17~36 (entire `TemplateEditProps` + `TemplateReadOnlyProps` block).

**Existing code (L17~36):**
```ts
export interface TemplateEditProps {
  documentId: number | null;
  initialData?: {
    title: string;
    bodyHtml?: string;
    formData?: string;
    /** CUSTOM 템플릿 전용 — DocumentDetailResponse.schemaDefinitionSnapshot 값 (JSON string) */
    schemaSnapshot?: string | null;
  };
  onSave: (data: { title: string; bodyHtml?: string; formData?: string }) => Promise<void>;
  readOnly?: boolean;
}

export interface TemplateReadOnlyProps {
  title: string;
  bodyHtml?: string | null;
  formData?: string | null;
  /** CUSTOM 템플릿 전용 — DocumentDetailResponse.schemaDefinitionSnapshot 값 (JSON string) */
  schemaSnapshot?: string | null;
}
```

**Phase 34 modification — add drafter props to BOTH interfaces:**
```ts
import type { DrafterLive, DrafterSnapshot } from '../DrafterInfoHeader';

export interface TemplateEditProps {
  documentId: number | null;
  initialData?: { title: string; bodyHtml?: string; formData?: string; schemaSnapshot?: string | null };
  onSave: (data: { title: string; bodyHtml?: string; formData?: string }) => Promise<void>;
  readOnly?: boolean;
  /** Phase 34 — DRAFT 모드 헤더 데이터. 신규/저장된 DRAFT 모두 라이브 정보로 정규화. */
  drafterLive: DrafterLive;
}

export interface TemplateReadOnlyProps {
  title: string;
  bodyHtml?: string | null;
  formData?: string | null;
  schemaSnapshot?: string | null;
  /** Phase 34 — submit 시점 박제된 snapshot (legacy 문서는 null). */
  drafterSnapshot: DrafterSnapshot | null;
  /** Phase 34 — snapshot null 일 때 fallback. */
  drafterLive: DrafterLive;
  /** Phase 34 — snapshot null 일 때 날짜 source. */
  submittedAt: string;
}
```

**Pattern note:** The 12 form components (6 Edit + 6 ReadOnly) all `import type { TemplateEditProps } from './templateRegistry';` (verified in `GeneralForm.tsx` L8, `ExpenseForm.tsx` L9). Adding fields to the shared interface auto-flows to all consumers; the only required edit per file is the JSX insertion of `<DrafterInfoHeader ... />`.

---

### 7. Page-level props plumbing (FE)

**`DocumentEditorPage.tsx` L315~330 — Edit page existing pattern:**
```tsx
{EditComponent && (
  <EditComponent
    documentId={savedDocId}
    initialData={
      existingDoc
        ? {
            title: existingDoc.title,
            bodyHtml: existingDoc.bodyHtml ?? undefined,
            formData: existingDoc.formData ?? undefined,
            schemaSnapshot,
          }
        : undefined
    }
    onSave={handleSave}
  />
)}
```

**Phase 34 modification (per D-F1 + D-D2 — UserProfile is now extended):**
```tsx
import { useAuthStore } from '../../../stores/authStore';
// ...
const user = useAuthStore((s) => s.user);  // After D-F1, user has departmentName + positionName

{EditComponent && (
  <EditComponent
    documentId={savedDocId}
    initialData={existingDoc ? { ... } : undefined}
    onSave={handleSave}
    drafterLive={
      existingDoc
        ? {
            drafterName: existingDoc.drafterName,           // flat field after D-G1
            departmentName: existingDoc.departmentName,
            positionName: existingDoc.positionName,
          }
        : {
            // 신규 작성 — UserProfile 확장 (D-F1) 결과 사용
            drafterName: user?.name ?? '',
            departmentName: user?.departmentName ?? '',
            positionName: user?.positionName ?? null,
          }
    }
  />
)}
```

**`DocumentDetailPage.tsx` L226~229 — Pitfall 6 latent bug fix (D-G2):**

Existing (BUGGY):
```tsx
<span className="text-gray-900 dark:text-gray-50">
  {doc.drafter.name} ({doc.drafter.departmentName})
</span>
```

After Phase 34 — TWO changes:
1. **Delete this entire `<div>` cell (L225~230)** per UI-SPEC §"Position note for DocumentDetailPage" (header replaces the `기안자` cell — duplication forbidden).
2. The other meta-cells (양식/상태/문서번호/작성일/제출일) at L217~244 remain.

If the cell is **kept** (planner override): replace `doc.drafter.name` → `doc.drafterName` and `doc.drafter.departmentName` → `doc.departmentName`. But UI-SPEC mandates deletion.

**`DocumentDetailPage.tsx` L250~256 — ReadOnly props (per D-D6, mirror Edit pattern):**

Existing:
```tsx
{ReadOnlyComponent ? (
  <ReadOnlyComponent
    title={doc.title}
    bodyHtml={doc.bodyHtml}
    formData={doc.formData}
    schemaSnapshot={schemaSnapshot}
  />
) : ( ... )}
```

After Phase 34:
```tsx
{ReadOnlyComponent ? (
  <ReadOnlyComponent
    title={doc.title}
    bodyHtml={doc.bodyHtml}
    formData={doc.formData}
    schemaSnapshot={schemaSnapshot}
    drafterSnapshot={
      (() => {
        try {
          return doc.formData
            ? (JSON.parse(doc.formData)?.drafterSnapshot ?? null)
            : null;
        } catch {
          return null;
        }
      })()
    }
    drafterLive={{
      drafterName: doc.drafterName,         // flat field after D-G1
      departmentName: doc.departmentName,
      positionName: doc.positionName,
    }}
    submittedAt={doc.submittedAt ?? ''}     // SUBMITTED docs always have submittedAt; '' is defensive
  />
) : ( ... )}
```

**Note:** The IIFE-style snapshot parse can be lifted to `useMemo` inside the page; concrete extraction is a planner micro-decision.

---

### 8. `types/document.ts` — DocumentDetailResponse type fix (D-G1)

**Analog:** `DocumentDetailResponse.java` (BE record) — the BE record IS the SoT.

**Current FE type (L15~37, BUGGY):**
```ts
export interface DrafterInfo {
  id: number;
  name: string;
  departmentName: string;
  positionName: string | null;
}

export interface DocumentDetailResponse extends DocumentResponse {
  drafter: DrafterInfo;       // ← MISMATCH: backend has flat fields, not nested
  bodyHtml: string | null;
  ...
}
```

**Backend record (verbatim, `DocumentDetailResponse.java` L13~16) — the alignment target:**
```java
Long drafterId,
String drafterName,
String departmentName,
String positionName,
```

**Phase 34 fix (D-G1):**
```ts
// REMOVE: drafter: DrafterInfo  ← nested mismatch
// ADD: flat fields aligned with backend
export interface DocumentDetailResponse extends DocumentResponse {
  drafterId: number;             // already exists at L29 (no change)
  drafterName: string;           // NEW (D-G1)
  departmentName: string;        // NEW (D-G1)
  positionName: string | null;   // NEW (D-G1)
  bodyHtml: string | null;
  formData: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  currentStep: number | null;
  sourceDocId: number | null;
  approvalLines: ApprovalLineResponse[];
  schemaVersion?: number | null;
  schemaDefinitionSnapshot?: string | null;
}
```

**`DrafterInfo` type retention check (D-G3):** `grep -rn "DrafterInfo" frontend/src` to confirm whether other files still import it. If unused after the `DocumentDetailResponse` edit, remove the declaration. Likely candidates: `documentApi.ts`, `DocumentSearchPage.tsx`. RESEARCH Sources confirm `documentApi.ts` (51 lines) has no adapter — DrafterInfo may only be referenced by the now-fixed type.

---

### 9. `frontend/src/types/auth.ts` — UserProfile extension (D-F1)

**Analog:** `UserProfileDto.java` (BE record) — alignment target.

**Existing code (L1~8, verbatim):**
```ts
export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  departmentId: number;
  mustChangePassword: boolean;
}
```

**Phase 34 modification:**
```ts
export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  departmentId: number;
  mustChangePassword: boolean;
  /** Phase 34 (D-F1) — login/refresh 응답에 라이브 부서명. orphan-safe nullable. */
  departmentName: string | null;
  /** Phase 34 (D-F1) — 라이브 직위·직책. User.positionId nullable 이므로 nullable. */
  positionName: string | null;
}
```

**`LoginResponse`/`RefreshResponse` (L16~24) — NO CHANGE.** Both wrap `UserProfile`, so they auto-update.

---

### 10. `frontend/src/stores/authStore.ts` — no shape change

**Analog:** Itself (L1~25, complete file). The store imports `UserProfile` as a type:
```ts
import type { UserProfile } from '../types/auth';
```
Once `UserProfile` is extended (Pattern 9), the store is transitively updated. **No code edit needed**, only re-typecheck.

**Important:** Existing tokens in user-session storage will not contain the new fields. RESEARCH D-F3 already covered this — fallback to `?? ''` / `?? null` in consumers (Pattern 7 callsite), and the user receives populated fields on the next refresh-token cycle (≤ 30 min per JWT TTL).

---

### 11. `frontend/public/locales/ko/document.json` — i18n keys (UI-SPEC §i18n Key Contract)

**Analog:** Existing `document.json` tree (verified L1~40 has top-level keys `pageTitle`, `templateModal`, `submitConfirm`, `error`, etc.). Phase 34 adds a sibling subtree.

**Existing pattern excerpt:**
```json
{
  "pageTitle": "내 문서",
  "templateModal": {
    "title": "새 문서 작성",
    "subtitle": "작성할 양식을 선택하세요"
  },
  "error": {
    "saveFailed": "문서 저장에 실패했습니다. ..."
  }
}
```

**Phase 34 addition (UI-SPEC §i18n Key Contract — 8 keys, all Korean):**
```json
"drafterInfo": {
  "departmentLabel": "부서",
  "positionLabel": "직위·직책",
  "drafterLabel": "기안자",
  "draftedAtLabel": "기안일",
  "draftedAtPlaceholder": "—",
  "currentInfoBadge": "(현재 정보)",
  "headerAriaLabel": "기안자 정보",
  "emptyPosition": "—"
}
```

**English file `en/document.json` — DO NOT MODIFY** (CONTEXT deferred + Phase 32-04 precedent confirmed in RESEARCH Pattern 5).

---

### 12. Built-in form components × 12 — single-line insertion

**Edit prototype (`GeneralForm.tsx` L49~53):**
```tsx
return (
  <form id="document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
      {t('template.GENERAL')}
    </div>
```

**Phase 34 insertion (between `<form ...>` and `<div className="text-xs ...">`):**
```tsx
return (
  <form id="document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
    <DrafterInfoHeader mode="draft" live={drafterLive} />
    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
      {t('template.GENERAL')}
    </div>
```
Plus add `drafterLive` to the destructured props (already added to `TemplateEditProps`):
```tsx
export default function GeneralForm({
  documentId,
  initialData,
  onSave,
  readOnly = false,
  drafterLive,        // ← NEW — comes from extended TemplateEditProps
}: TemplateEditProps) {
```

**Apply same pattern verbatim to:** `ExpenseForm.tsx`, `LeaveForm.tsx`, `PurchaseForm.tsx`, `BusinessTripForm.tsx`, `OvertimeForm.tsx`. Each verified to use `<form id="document-form" ...>` as root. Spot-check `ExpenseForm.tsx` L17 — same `TemplateEditProps` destructure, header insertion goes immediately inside `<form>`.

**ReadOnly prototype (`GeneralReadOnly.tsx`, complete file):**
```tsx
import type { TemplateReadOnlyProps } from './templateRegistry';

export default function GeneralReadOnly({ bodyHtml }: TemplateReadOnlyProps) {
  return (
    <div>
      {bodyHtml ? ( ... ) : ( ... )}
    </div>
  );
}
```

**Phase 34 modification:**
```tsx
import type { TemplateReadOnlyProps } from './templateRegistry';
import DrafterInfoHeader from '../DrafterInfoHeader';

export default function GeneralReadOnly({
  bodyHtml,
  drafterSnapshot,
  drafterLive,
  submittedAt,
}: TemplateReadOnlyProps) {
  return (
    <div>
      <DrafterInfoHeader
        mode="submitted"
        snapshot={drafterSnapshot}
        live={drafterLive}
        submittedAt={submittedAt}
      />
      {bodyHtml ? ( ... ) : ( ... )}
    </div>
  );
}
```
Apply the same pattern to: `ExpenseReadOnly.tsx`, `LeaveReadOnly.tsx`, `PurchaseReadOnly.tsx`, `BusinessTripReadOnly.tsx`, `OvertimeReadOnly.tsx`.

**Dynamic Edit (`DynamicCustomForm.tsx` L207~213):**
```tsx
return (
  <FormProvider {...form}>
    <form
      id="document-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          제목<span className="text-red-500 ml-1">*</span>
```

**Phase 34 — header goes between `<form ...>` and `<div className="mb-4">` (title block at L214):**
```tsx
<form id="document-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
  <DrafterInfoHeader mode="draft" live={drafterLive} />
  <div className="mb-4">
    <label ... >제목 ... </label>
```
Plus thread `drafterLive` through the outer `DynamicCustomForm` (L29~33) AND `DynamicFormInner` (L80~88) props.

**Dynamic ReadOnly (`DynamicCustomReadOnly.tsx` L18~22):**
```tsx
export default function DynamicCustomReadOnly({
  title,
  formData,
  schemaSnapshot,
}: TemplateReadOnlyProps) {
```
Adapt to: destructure `drafterSnapshot, drafterLive, submittedAt` and insert `<DrafterInfoHeader mode="submitted" ... />` as first child of the root `<div>` (the schema-error-fallback path on L43~48 also needs the header — UX decision: render header even on schema-error so the user still sees who drafted).

---

## Shared Patterns

### Authentication / Authorization (BE)

**No changes.** Per RESEARCH Security Domain §V4: existing `getDocument` 4-check (drafter / 결재참여자 / 같은부서 ADMIN / SUPER_ADMIN) gates access to BOTH `formData` (now containing `drafterSnapshot`) and the existing flat `departmentName`/`positionName`. No new exposure surface.

### Error Handling (BE)

**Source:** `DocumentService.java` L314~319 (existing audit-log try/catch).
**Apply to:** New snapshot capture block at L296+.
**Adaptation:** Phase 34 D-C7 (Q2=A) overrides the swallow-and-warn convention with `throw new RuntimeException(...)` to roll back. This is the ONLY place in `DocumentService` that throws on a Jackson failure rather than logging — document this divergence in the code comment.

### Null-safe LAZY join (BE — used in 6 places)

**Source:** `DocumentMapper.java` L22~23 (canonical), `DashboardService.java` L121~122, `ApprovalService.java` L184~185, `DepartmentService.java` L58, `RegistrationService.java` L122, `UserSearchService.java` L40.
**Apply to:**
- `DocumentService.submitDocument()` snapshot block (Pattern 1) — for `drafter.getDepartment()` and `drafter.getPosition()`.
- `AuthService.buildUserProfile()` (Pattern 2) — for `user.getDepartment()` and `user.getPosition()`.
**Excerpt:**
```java
String departmentName = drafter.getDepartment() != null
        ? drafter.getDepartment().getName() : null;
```

### Date formatting (FE)

**Source:** `DocumentDetailPage.tsx` L125~133 (`formatDate` local fn), `DocumentListTable.tsx` L17~18, `dashboard/PendingList.tsx` L102.
**Apply to:** `DrafterInfoHeader.tsx` (inline `formatDraftedDate` — see Pattern 4).
**No util extraction** — Phase 34 keeps the existing per-call inline pattern (RESEARCH Pattern 6 — central util deferred).
**Note:** UI-SPEC §"Date Format Contract" mandates dropping `hour`/`minute` (only `year`/`month`/`day`).

### i18n (FE)

**Source:** `GeneralForm.tsx` L16 (`useTranslation('document')`).
**Apply to:** `DrafterInfoHeader.tsx` (only Phase 34 component using i18n).
**Namespace:** `'document'` (singular — verified in `i18n/config.ts` L14 namespace registration). `documents.json` does NOT exist.
**Locale files modified:** `frontend/public/locales/ko/document.json` only. **NOT** `en/document.json` (Phase 32-04 precedent — Korean only per CONTEXT deferred).

### Test infra reuse (BE + FE)

**BE:** `DocumentSubmitTest.java` (extend) — `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")` + `JdbcTemplate` cleanup + `tokenHelper.superAdminToken()`. **No new test file** — RESEARCH Q6.
**FE:** `__tests__/DrafterInfoHeader.test.tsx` (NEW) — `vitest + @testing-library/react`. Mirror harness from `__tests__/DrafterCombo.test.tsx`. Mock only `react-i18next` (no API, no Zustand).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All 23 files have at least a strong-match analog. The `formData` JSON-merge pattern at submit time is novel **for that method**, but `DocumentService.submitDocument()` itself contains the closest precedent at L314~319 (same ObjectMapper, same try/catch shape) — not a true gap, just a new responsibility within an existing pattern. |

---

## Pattern Summary (3 sentences for the planner)

1. **All 12 form-component edits are 1-3 line insertions** of `<DrafterInfoHeader mode="..." {...} />` immediately inside the root `<form>` (Edit) or root `<div>` (ReadOnly), threading `drafterLive`/`drafterSnapshot`/`submittedAt` props through the shared `TemplateEditProps`/`TemplateReadOnlyProps` SoT in `templateRegistry.ts` (single-edit fan-out).
2. **The new component's visual contract is a verbatim copy** of `DocumentDetailPage.tsx` L216~245's class strings (`grid grid-cols-2 md:grid-cols-4 gap-3`, `text-gray-500 dark:text-gray-400 block mb-0.5`, `text-gray-900 dark:text-gray-50`) and L249's card wrapper (`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4`), upgraded to semantic `<dl>/<dt>/<dd>` markup per UI-SPEC.
3. **Backend snapshot capture mirrors the audit-log JSON write** already in the same method (`DocumentService.submitDocument()` L314~319) — same `objectMapper`, same try/catch shape, same txn boundary — with the single deviation that D-C7 mandates `throw` instead of `log.warn(...)` on Jackson failure.

---

## Metadata

**Analog search scope:**
- `backend/src/main/java/com/micesign/service/` (DocumentService, AuthService)
- `backend/src/main/java/com/micesign/dto/` (auth, document subdirs)
- `backend/src/main/java/com/micesign/mapper/` (DocumentMapper)
- `backend/src/test/java/com/micesign/document/` (DocumentSubmitTest)
- `frontend/src/features/document/components/` (templates/, dynamic/, __tests__/)
- `frontend/src/features/document/pages/` (DocumentEditorPage, DocumentDetailPage)
- `frontend/src/features/document/types/document.ts`
- `frontend/src/stores/authStore.ts`, `frontend/src/types/auth.ts`
- `frontend/public/locales/ko/document.json`

**Files read (analog extraction):** 14 (from RESEARCH Sources HIGH-confidence list, narrowed to ones whose code is reproduced inline above).

**Pattern extraction date:** 2026-04-29

**Dependencies for planner:**
- All 14 form-integration callsites depend on (a) `DrafterInfoHeader.tsx` existing, (b) `templateRegistry.ts` props extension, (c) `types/document.ts` D-G1 fix (because pages read flat fields), (d) `types/auth.ts` D-F1 extension (because `DocumentEditorPage` reads `user.departmentName` for new-doc DRAFT). Wave 0 should land items (a)/(b)/(c)/(d) before any of the 12 form edits.
- BE snapshot capture (Pattern 1) is independent of FE changes — can land in parallel wave.
- `DocumentSubmitTest` extension (Pattern 3) is independent of all FE changes — can land in same BE commit as Pattern 1.

---

## PATTERN MAPPING COMPLETE
