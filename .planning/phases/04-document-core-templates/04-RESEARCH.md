# Phase 4: Document Core & Templates - Research

**Researched:** 2026-04-02
**Domain:** Document CRUD, Form Templates (GENERAL/EXPENSE/LEAVE), Rich Text Editing
**Confidence:** HIGH

## Summary

Phase 4 builds the document creation, editing, listing, and detail viewing system with three hardcoded form templates. The backend requires new entities (Document, DocumentContent, ApprovalTemplate), a Flyway migration to seed templates and create a `leave_type` table, REST APIs for document CRUD and template listing, and JSON validation per template type. The frontend introduces Tiptap rich text editor for the General form, an inline editable expense table with auto-sum, a leave request form with date-fns date calculations, a template selection modal, document list page, and document detail page.

The existing codebase provides strong patterns to follow: feature-based folder structure (`features/document/`), TanStack Query hooks, Axios API client, MapStruct mappers, React Hook Form + Zod validation, and the `ApiResponse<T>` envelope. The main new dependencies are Tiptap editor packages (all at v3.22.0) and date-fns (v4.1.0) for leave day calculation.

**Primary recommendation:** Follow existing Phase 3 patterns exactly for backend (Controller/Service/Repository/Mapper/DTO) and frontend (api/hooks/components/pages). The primary complexity is in the three template components and the Tiptap editor integration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Use Tiptap (ProseMirror-based) for General form's body editor
- D-02: Full feature set -- bold, italic, underline, headings, bullet/numbered lists, tables, images, blockquotes
- D-03: Output stored as HTML in `document_content.body_html`
- D-04: Inline editable table for expense items -- rows with add/delete buttons, spreadsheet-like feel
- D-05: Currency display: KRW symbol + comma formatting (e.g., 10,000). Input accepts numbers only, display formatted
- D-06: Auto-sum total at table footer, recalculated on every cell change
- D-07: Leave types are extensible -- `leave_type` DB table created via V5 migration with 4 default seeds. Frontend fetches types from API. Admin management UI deferred
- D-08: Half-day uses time-based calculation -- start/end time for fractional day computation
- D-09: Full-day leave uses date range picker with auto-calculated day count
- D-10: Document list uses table layout -- consistent with Phase 3 user list pattern
- D-11: Document detail is a dedicated page at `/documents/:id`
- D-12: Per-template fixed JSON schema in `document_content.form_data`
- D-13: Backend validates JSON structure per template_code on save
- D-14: Template selection via modal popup -- "new document" button opens modal with 3 template cards
- D-15: Editor URL: `/documents/new/:templateCode`
- D-16: Existing draft edit URL: `/documents/:id` -- same route for view and edit, mode determined by document status
- D-17: Debounce 30 seconds auto-save after inactivity. Manual save button also available
- D-18: DRAFT documents use physical delete (hard delete from DB)
- D-19: Dual validation -- real-time field validation (React Hook Form + Zod) + full form validation before API save
- D-20: Inline messages for save success/failure, not toast notifications

### Claude's Discretion
None specified -- all major decisions locked in CONTEXT.md

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-01 | User can create a draft document by selecting a form template | Template list API, template selection modal, document create API, Tiptap editor setup |
| DOC-02 | User can edit and delete their own draft documents | Document update API, physical delete API, owner validation, auto-save with debounce |
| DOC-05 | User can view document detail page with full content, approval line status, and attachments | Document detail API with access control, read-only template rendering, placeholder sections for approval/attachments |
| DOC-06 | User can view list of their drafted and submitted documents with status | My documents API with pagination/filtering, table layout with status badges |
| TPL-01 | General approval form with title, rich text body, and attachments | Tiptap editor with full extensions, HTML storage, attachment placeholder UI |
| TPL-02 | Expense report form with item table, auto-sum | Inline editable table component, currency formatting, Zod array validation |
| TPL-03 | Leave request form with leave type, date range, auto-calculated days | leave_type DB table + API, date-fns calculations, half-day time picker |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Java 17 + Spring Boot 3.x + Spring Security + JWT + JPA/Hibernate + QueryDSL + Gradle
- React 18 + Vite + TypeScript + Zustand + TanStack Query v5 + TailwindCSS
- React Hook Form + Zod for form validation
- Axios with JWT interceptor for HTTP client
- MapStruct for DTO/Entity mapping
- Flyway for all schema changes
- Each template is a hardcoded React component registered in `TEMPLATE_REGISTRY`
- Feature-based folder structure: `features/{domain}/api/`, `hooks/`, `components/`, `pages/`
- H2 MariaDB mode for integration tests (no Docker)
- i18n with `public/locales/{lang}/{namespace}.json`

## Standard Stack

### Core (New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tiptap/react | 3.22.0 | React bindings for Tiptap editor | D-01 locked decision, ProseMirror-based |
| @tiptap/pm | 3.22.0 | ProseMirror peer dependency | Required by @tiptap/react |
| @tiptap/starter-kit | 3.22.0 | Base extensions (bold, italic, headings, lists, blockquote, etc.) | Bundles most common extensions |
| @tiptap/extension-underline | 3.22.0 | Underline formatting | D-02 requires underline |
| @tiptap/extension-table | 3.22.0 | Table support in editor | D-02 requires tables |
| @tiptap/extension-table-row | 3.22.0 | Table row node | Required by table extension |
| @tiptap/extension-table-header | 3.22.0 | Table header cell node | Required by table extension |
| @tiptap/extension-table-cell | 3.22.0 | Table cell node | Required by table extension |
| @tiptap/extension-image | 3.22.0 | Image embedding | D-02 requires images |
| date-fns | 4.1.0 | Date arithmetic for leave day calculation | Lightweight, tree-shakeable, immutable |

### Already Installed (No Action)

| Library | Version | Purpose |
|---------|---------|---------|
| react-hook-form | 7.72.0 | Form state management |
| @hookform/resolvers | 5.2.2 | Zod resolver integration |
| zod | 4.3.6 | Schema validation |
| @tanstack/react-query | 5.95.2 | Server state management |
| axios | 1.14.0 | HTTP client with interceptors |
| lucide-react | 1.7.0 | Icons |
| react-router | 7.13.2 | Client-side routing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| date-fns | dayjs (1.11.20) | dayjs is smaller but date-fns is more tree-shakeable and has better TypeScript types; either works for this use case |
| Tiptap tables in editor | None | Locked decision D-02 |

**Installation:**
```bash
cd frontend && npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell @tiptap/extension-image date-fns
```

## Architecture Patterns

### Recommended Project Structure

```
backend/src/main/java/com/micesign/
  domain/
    Document.java                  # Entity
    DocumentContent.java           # Entity (1:1 with Document)
    ApprovalTemplate.java          # Entity
    LeaveType.java                 # Entity (D-07)
    enums/
      DocumentStatus.java          # DRAFT, SUBMITTED, APPROVED, REJECTED, WITHDRAWN
  dto/document/
    CreateDocumentRequest.java     # templateCode, title, bodyHtml, formData
    UpdateDocumentRequest.java     # title, bodyHtml, formData
    DocumentResponse.java          # List item response
    DocumentDetailResponse.java   # Full detail with content, placeholders
    DrafterResponse.java           # Nested drafter info
  dto/template/
    TemplateResponse.java          # Template list item
  dto/leavetype/
    LeaveTypeResponse.java         # Leave type list item
  controller/
    DocumentController.java        # /api/v1/documents/**
    TemplateController.java        # /api/v1/templates
    LeaveTypeController.java       # /api/v1/leave-types
  service/
    DocumentService.java           # Business logic
    TemplateService.java           # Template queries
    DocumentFormValidator.java     # JSON schema validation per template
  repository/
    DocumentRepository.java
    DocumentContentRepository.java
    ApprovalTemplateRepository.java
    LeaveTypeRepository.java
  mapper/
    DocumentMapper.java            # MapStruct
    TemplateMapper.java            # MapStruct

frontend/src/features/document/
  api/
    documentApi.ts                 # Document CRUD endpoints
    templateApi.ts                 # Template list endpoint
    leaveTypeApi.ts                # Leave type list endpoint
  hooks/
    useDocuments.ts                # TanStack Query hooks for documents
    useTemplates.ts                # Template list hook
    useLeaveTypes.ts               # Leave type list hook
    useAutoSave.ts                 # Debounced auto-save hook
  components/
    TemplateSelectionModal.tsx     # D-14: Template picker modal
    DocumentListTable.tsx          # D-10: Table layout
    DocumentStatusBadge.tsx        # Status color badges
    TiptapEditor.tsx               # Tiptap wrapper component
    TiptapToolbar.tsx              # Editor toolbar with formatting buttons
    templates/
      GeneralForm.tsx              # TPL-01: Rich text editor form
      ExpenseForm.tsx              # TPL-02: Expense item table form
      LeaveForm.tsx                # TPL-03: Leave request form
      GeneralReadOnly.tsx          # Read-only view
      ExpenseReadOnly.tsx          # Read-only view
      LeaveReadOnly.tsx            # Read-only view
      templateRegistry.ts          # TEMPLATE_REGISTRY mapping
  pages/
    DocumentListPage.tsx           # /documents/my
    DocumentEditorPage.tsx         # /documents/new/:templateCode
    DocumentDetailPage.tsx         # /documents/:id
  types/
    document.ts                    # Document-related TypeScript types
  validations/
    generalSchema.ts               # Zod schema for General form
    expenseSchema.ts               # Zod schema for Expense form
    leaveSchema.ts                 # Zod schema for Leave form
```

### Pattern 1: Template Registry

**What:** A registry object mapping template codes to their edit and read-only components
**When to use:** Rendering the correct form component based on templateCode

```typescript
// templateRegistry.ts
import GeneralForm from './GeneralForm';
import ExpenseForm from './ExpenseForm';
import LeaveForm from './LeaveForm';
import GeneralReadOnly from './GeneralReadOnly';
import ExpenseReadOnly from './ExpenseReadOnly';
import LeaveReadOnly from './LeaveReadOnly';

export interface TemplateEntry {
  editComponent: React.ComponentType<TemplateEditProps>;
  readOnlyComponent: React.ComponentType<TemplateReadOnlyProps>;
  label: string;
}

export const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  GENERAL: {
    editComponent: GeneralForm,
    readOnlyComponent: GeneralReadOnly,
    label: '일반 업무 기안',
  },
  EXPENSE: {
    editComponent: ExpenseForm,
    readOnlyComponent: ExpenseReadOnly,
    label: '지출 결의서',
  },
  LEAVE: {
    editComponent: LeaveForm,
    readOnlyComponent: LeaveReadOnly,
    label: '휴가 신청서',
  },
};
```

### Pattern 2: Auto-Save with Debounce (D-17)

**What:** Debounced auto-save that triggers 30s after the last change
**When to use:** Document editor pages for DRAFT status

```typescript
// useAutoSave.ts
import { useEffect, useRef, useCallback } from 'react';

export function useAutoSave(
  saveFn: () => Promise<void>,
  dependencies: unknown[],
  delayMs = 30000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isSaving = useRef(false);

  const triggerSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!isSaving.current) {
        isSaving.current = true;
        try { await saveFn(); } finally { isSaving.current = false; }
      }
    }, delayMs);
  }, [saveFn, delayMs]);

  useEffect(() => {
    triggerSave();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return { triggerSave };
}
```

### Pattern 3: Backend Form Data Validation (D-13)

**What:** Per-template JSON validation on the backend
**When to use:** Document create and update endpoints

```java
// DocumentFormValidator.java
@Component
public class DocumentFormValidator {

    public void validate(String templateCode, String formDataJson) {
        if ("GENERAL".equals(templateCode)) {
            // formData can be null for GENERAL (uses bodyHtml)
            return;
        }
        if (formDataJson == null || formDataJson.isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA",
                "양식 데이터가 필요합니다.");
        }
        // Parse and validate structure per template
        switch (templateCode) {
            case "EXPENSE" -> validateExpenseFormData(formDataJson);
            case "LEAVE" -> validateLeaveFormData(formDataJson);
            default -> throw new BusinessException("TPL_UNKNOWN",
                "알 수 없는 양식 코드입니다: " + templateCode);
        }
    }
}
```

### Pattern 4: Document Status Enum

```java
public enum DocumentStatus {
    DRAFT, SUBMITTED, APPROVED, REJECTED, WITHDRAWN
}
```

### Anti-Patterns to Avoid

- **Dynamic form rendering engine:** Do NOT build a generic JSON-to-form renderer. Each template is a hardcoded React component (per CLAUDE.md architecture decision).
- **Storing rich text as Markdown:** D-03 specifies HTML storage in `body_html`. Do not convert to/from Markdown.
- **Auto-save on every keystroke:** D-17 specifies 30-second debounce, not real-time save. Use debounce, not throttle.
- **Soft delete for drafts:** D-18 specifies physical (hard) delete for DRAFT documents.
- **Toast notifications:** D-20 specifies inline messages, not toasts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contentEditable wrapper | Tiptap (@tiptap/react) | ProseMirror handles selection, clipboard, undo/redo, collaborative editing edge cases |
| Currency formatting | Manual regex formatting | `Intl.NumberFormat('ko-KR')` | Handles locale-specific formatting, edge cases with large numbers |
| Date difference calculation | Manual day counting | `date-fns/differenceInCalendarDays` or `differenceInBusinessDays` | Handles timezone, DST, leap year edge cases |
| Form state + validation | Manual useState/onChange | React Hook Form + Zod | D-19 requires dual validation; RHF handles dirty tracking, submission state |
| Debounced save | Manual setTimeout management | Custom hook wrapping setTimeout | But use the pattern above, not a library -- it's simple enough |

**Key insight:** The three template forms have very different structures (rich text vs table vs date picker), so they must be separate components. The TEMPLATE_REGISTRY pattern unifies rendering without forcing a generic abstraction.

## Common Pitfalls

### Pitfall 1: Tiptap Content Sync with React Hook Form
**What goes wrong:** Tiptap manages its own internal state via ProseMirror. Using `register()` directly doesn't work -- you need `Controller` or manual `setValue`/`watch` to sync.
**Why it happens:** Tiptap's `useEditor` and RHF's form state are independent state trees.
**How to avoid:** Use RHF's `Controller` component wrapping the Tiptap `EditorContent`, syncing on Tiptap's `onUpdate` callback. Or manage Tiptap state outside RHF and merge before save.
**Warning signs:** Editor content not included in form submission, or HTML not updating in form state.

### Pitfall 2: Expense Table Auto-Calculation Race
**What goes wrong:** Changing quantity or unitPrice should auto-compute amount and totalAmount, but if done in event handlers there can be stale state.
**Why it happens:** React state updates are batched; reading state immediately after `setValue` gets old values.
**How to avoid:** Use Zod transform or `watch()` + `useEffect` to derive computed fields. Calculate `amount = quantity * unitPrice` at render time, not in event handlers.
**Warning signs:** Total not matching individual amounts after rapid edits.

### Pitfall 3: Zod v4 Type Inference Issues
**What goes wrong:** Zod v4 type inference with react-hook-form can fail for optional fields or arrays.
**Why it happens:** Known from Phase 3 -- Zod v4 uses `{ error }` not `{ required_error }`, and `.default()` causes type issues.
**How to avoid:** Follow Phase 3 patterns exactly. Test Zod schemas separately before wiring to forms. Avoid `.default()` on fields used with RHF.
**Warning signs:** TypeScript errors in `zodResolver` or form `register()` calls.

### Pitfall 4: Leave Day Calculation Edge Cases
**What goes wrong:** Calculating business days between two dates incorrectly when weekends or the calculation method for half-days is wrong.
**Why it happens:** D-08 specifies time-based calculation for half-days, D-09 specifies calendar day count for full days. The FSD says "business day" calculation.
**How to avoid:** Clarify: for MVP, use simple calendar day difference (`differenceInCalendarDays + 1` for inclusive range). Half-day = 0.5 days. Business day calculation can be deferred if not in explicit requirements.
**Warning signs:** Day count off by one (inclusive vs exclusive range).

### Pitfall 5: H2 JSON Column Compatibility
**What goes wrong:** `JSON` column type in MariaDB schema may not work directly in H2 test mode.
**Why it happens:** H2's MariaDB compatibility mode doesn't fully support the `JSON` type.
**How to avoid:** In test migrations, use `CLOB` or `TEXT` instead of `JSON` for `document_content.form_data`. The main migration uses `JSON` for MariaDB.
**Warning signs:** Test migration failures on `JSON` column type.

### Pitfall 6: Document Routes vs Admin Routes
**What goes wrong:** Putting document routes under `AdminRoute` guard, making them admin-only.
**Why it happens:** Copy-paste from Phase 3 admin route structure.
**How to avoid:** Document routes go under `ProtectedRoute` (any authenticated user), NOT under `AdminRoute`. Template list API at `/api/v1/templates` also needs to be accessible to all authenticated users.
**Warning signs:** Regular users getting 403 on document pages.

## Code Examples

### Tiptap Editor Setup (React)

```typescript
// TiptapEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export default function TiptapEditor({ content, onChange, editable = true }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div>
      {editable && editor && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
```

### Currency Formatting (Expense Form)

```typescript
// Format number as Korean Won
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

// Parse numeric input (strip non-digits)
export function parseNumericInput(value: string): number {
  return parseInt(value.replace(/\D/g, ''), 10) || 0;
}
```

### Leave Day Calculation

```typescript
import { differenceInCalendarDays } from 'date-fns';

export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  isHalfDay: boolean
): number {
  if (isHalfDay) return 0.5;
  // Inclusive range: Apr 1 to Apr 3 = 3 days
  return differenceInCalendarDays(endDate, startDate) + 1;
}
```

### Flyway V5 Migration (leave_type table + template seeds)

```sql
-- V5__add_document_support.sql

-- Leave type master table (D-07: extensible)
CREATE TABLE leave_type (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE COMMENT '휴가 유형 코드',
    name        VARCHAR(50) NOT NULL COMMENT '휴가 유형명',
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE COMMENT '반차 여부',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='휴가 유형';

-- Seed default leave types
INSERT INTO leave_type (code, name, is_half_day, sort_order) VALUES
('ANNUAL', '연차', FALSE, 1),
('HALF_DAY', '반차', TRUE, 2),
('SICK', '병가', FALSE, 3),
('FAMILY', '경조', FALSE, 4);

-- Seed approval templates
INSERT INTO approval_template (code, name, description, prefix, sort_order) VALUES
('GENERAL', '일반 업무 기안', '일반적인 업무 기안 및 보고에 사용합니다.', 'GEN', 1),
('EXPENSE', '지출 결의서', '지출 내역을 보고하고 승인을 요청합니다.', 'EXP', 2),
('LEAVE', '휴가 신청서', '휴가를 신청합니다.', 'LEV', 3);
```

### Document Entity

```java
@Entity
@Table(name = "document")
public class Document {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "doc_number")
    private String docNumber;

    @Column(name = "template_code", nullable = false)
    private String templateCode;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "drafter_id", nullable = false)
    private User drafter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus status = DocumentStatus.DRAFT;

    // ... timestamps, source_doc_id, current_step
}
```

### Document API Pattern (following existing conventions)

```typescript
// documentApi.ts
import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type { DocumentResponse, DocumentDetailResponse, CreateDocumentRequest, UpdateDocumentRequest } from '../types/document';

const BASE = '/documents';

export const documentApi = {
  getMyDocuments: (params: MyDocumentParams) =>
    apiClient.get<ApiResponse<PageResponse<DocumentResponse>>>(`${BASE}/my`, { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<DocumentDetailResponse>>(`${BASE}/${id}`),

  create: (data: CreateDocumentRequest) =>
    apiClient.post<ApiResponse<DocumentResponse>>(BASE, data),

  update: (id: number, data: UpdateDocumentRequest) =>
    apiClient.put<ApiResponse<DocumentResponse>>(`${BASE}/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`),
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Draft.js / Quill | Tiptap (ProseMirror) | 2023-2024 | Tiptap is now the standard React rich text editor; Draft.js is deprecated |
| moment.js | date-fns / dayjs | 2020+ | moment.js is in maintenance mode; date-fns is tree-shakeable |
| Class-based entities | JPA entity with constructor injection | Spring Boot 3.x | Follows current Spring patterns |

## Open Questions

1. **FSD vs CONTEXT.md leave type mismatch**
   - What we know: FSD defines leave types as enum values (ANNUAL, HALF_AM, HALF_PM, SICK, FAMILY). CONTEXT.md D-07 says extensible `leave_type` DB table with 4 seeds (연차, 반차, 병가, 경조).
   - What's unclear: Whether HALF_AM/HALF_PM (morning/afternoon half-day) distinction is needed, or just a single "반차" type with `is_half_day` flag.
   - Recommendation: Follow CONTEXT.md (locked decision) -- single "반차" type with `is_half_day` flag. D-08's time-based calculation handles AM/PM distinction at the document level, not the leave type level.

2. **Document detail page for DRAFT**
   - What we know: D-16 says `/documents/:id` shows edit mode for DRAFT, read-only for others.
   - What's unclear: Whether the editor page and detail page are the same component or separate.
   - Recommendation: Single `DocumentDetailPage` component that checks status. DRAFT renders edit form, others render read-only view. This avoids URL ambiguity.

3. **Main navigation layout**
   - What we know: Currently only `AdminLayout` with `AdminSidebar` exists. Documents need a different layout accessible to all users.
   - What's unclear: Exact navigation design.
   - Recommendation: Create a `MainLayout` component with a top navigation bar or sidebar that includes "Dashboard" (placeholder), "My Documents", and (if admin) "Admin" links. Document pages render inside this layout.

4. **FSD paymentMethod and accountInfo in Expense form**
   - What we know: FSD defines `paymentMethod` (CORPORATE_CARD/CASH/TRANSFER) and `accountInfo` fields. CONTEXT.md D-12 only lists `{items, totalAmount}`.
   - What's unclear: Whether paymentMethod/accountInfo are required for Phase 4.
   - Recommendation: Include them -- they're in the FSD schema and cheap to implement. The D-12 shorthand is a simplification, not an exclusion.

5. **FSD emergencyContact in Leave form**
   - What we know: FSD includes `emergencyContact` optional field. CONTEXT.md D-12 doesn't mention it.
   - What's unclear: Whether it's in scope.
   - Recommendation: Include it as optional -- it's in the FSD and trivial to add.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 5 (Spring Boot Test) + Vitest (not yet configured for frontend) |
| Config file | backend: `build.gradle.kts` tasks.withType<Test>, frontend: none yet |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.document.*"` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-01 | Create draft document via API | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.createDraft*"` | Wave 0 |
| DOC-02 | Update and delete own draft | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.updateDraft*"` | Wave 0 |
| DOC-05 | View document detail with access control | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.getDocumentDetail*"` | Wave 0 |
| DOC-06 | List my documents with pagination | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.getMyDocuments*"` | Wave 0 |
| TPL-01 | General form bodyHtml storage | integration | `./gradlew test --tests "com.micesign.document.DocumentFormValidatorTest.validateGeneral*"` | Wave 0 |
| TPL-02 | Expense formData JSON validation | unit | `./gradlew test --tests "com.micesign.document.DocumentFormValidatorTest.validateExpense*"` | Wave 0 |
| TPL-03 | Leave formData JSON validation | unit | `./gradlew test --tests "com.micesign.document.DocumentFormValidatorTest.validateLeave*"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.document.*" -x`
- **Per wave merge:** `cd backend && ./gradlew test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/document/DocumentControllerTest.java` -- covers DOC-01, DOC-02, DOC-05, DOC-06
- [ ] `backend/src/test/java/com/micesign/document/DocumentServiceTest.java` -- covers business logic
- [ ] `backend/src/test/java/com/micesign/document/DocumentFormValidatorTest.java` -- covers TPL-01, TPL-02, TPL-03
- [ ] `backend/src/test/resources/db/testmigration/V5__add_document_support.sql` -- H2-compatible version of V5 migration
- [ ] Framework install: frontend testing not yet configured (out of scope for this phase, backend tests sufficient)

## Sources

### Primary (HIGH confidence)
- Tiptap official docs (tiptap.dev) -- verified packages, versions, extension list
- npm registry -- verified all @tiptap/* packages at v3.22.0, date-fns at v4.1.0
- Existing codebase -- DepartmentController, departmentApi.ts, useDepartments.ts patterns
- FSD (docs/FSD_MiceSign_v1.0.md) -- API contracts FN-DOC-001 through FN-DOC-008, FN-TPL-001, FN-TPL-003
- DB schema (V1__create_schema.sql) -- document, document_content, approval_template tables

### Secondary (MEDIUM confidence)
- Tiptap React installation guide (tiptap.dev/docs/editor/getting-started/install/react)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified against npm registry, Tiptap is locked decision
- Architecture: HIGH -- follows existing codebase patterns exactly, all API contracts defined in FSD
- Pitfalls: HIGH -- Zod v4 issues documented from Phase 3 experience, H2 JSON compatibility is well-known

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days -- stable ecosystem, locked decisions)
