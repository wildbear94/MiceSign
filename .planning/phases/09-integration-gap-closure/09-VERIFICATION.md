---
phase: 09-integration-gap-closure
verified: 2026-04-10T14:30:00Z
status: human_needed
score: 10/10
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/6
  gaps_closed:
    - "PendingApprovalsPage is accessible at /approvals/pending route"
    - "CompletedDocumentsPage is accessible at /approvals/completed route"
    - "MainNavbar has approval navigation links (결재 대기, 완료된 문서)"
    - "DocumentEditorPage renders ApprovalLineEditor below the form"
    - "DocumentDetailPage renders ApprovalLineTimeline instead of placeholder text"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Log in as USER role, open document creation, click approval line selector - OrgTreePickerModal should load department tree without 403"
    expected: "Full department/user tree loads, user can select approvers"
    why_human: "Requires running server with USER-role authentication to confirm endpoint authorization works end-to-end"
  - test: "Check pending approvals page shows correct dates (not 'Invalid Date') and department names (not blank)"
    expected: "Dates render as YYYY-MM-DD, department names show correctly"
    why_human: "Requires real pending approval data in the database and visual inspection"
  - test: "Check dashboard pending list shows correct dates and department names"
    expected: "Dates render in Korean locale format, department names display correctly"
    why_human: "Requires running frontend with live backend data"
  - test: "Submit a rewrite (resubmission) of a rejected document and verify DOC_REWRITE audit log entry appears"
    expected: "Audit log contains DOC_REWRITE entry with sourceDocId and sourceDocNumber metadata"
    why_human: "Requires full multi-step workflow execution: draft -> submit -> reject -> rewrite"
  - test: "Navigate to /approvals/pending and /approvals/completed via navbar links"
    expected: "'결재 대기' and '완료된 문서' links appear in navbar; clicking each navigates to the respective page"
    why_human: "Requires running frontend with authenticated session to verify navbar rendering and navigation"
  - test: "Open DocumentEditorPage and verify ApprovalLineEditor renders below the form, OrgTreePickerModal opens when adding approver"
    expected: "Approval line editor UI is visible below the document form; org tree picker opens and shows departments without 403"
    why_human: "Requires running frontend with authenticated session to verify UI integration"
---

# Phase 09: Integration Gap Closure Verification Report

**Phase Goal:** Close integration gaps discovered during v1.0 milestone audit — fix backend wiring bugs (wrong query, missing audit trail, N+1), frontend wiring bugs (403 for USER role, type mismatches), and reconnect orphaned approval UI components (routes, navbar, editor/timeline integration).
**Verified:** 2026-04-10T14:30:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (GAP-09-01 closed by Plan 09-03)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | getCompletedApprovals() returns documents the user approved/rejected, not documents the user drafted | VERIFIED | ApprovalService.java uses `approvalLineRepository.findByApproverIdAndStatusIn()` then `documentRepository.findByIdInAndStatusIn()`. No `findByDrafterIdAndStatusIn` call. Empty docIds returns `Page.empty(pageable)`. |
| 2 | rewriteDocument() creates an audit log entry with DOC_REWRITE action | VERIFIED | DocumentService.java line 174: `auditLogService.log(userId, AuditAction.DOC_REWRITE, ...)`. AuditAction.java line 17: `public static final String DOC_REWRITE = "DOC_REWRITE"`. |
| 3 | AuditLogController delegates to AuditLogService.search() instead of direct repository + N+1 user lookups | VERIFIED | AuditLogController injects `AuditLogService`, calls `auditLogService.search()` at line 35. No `userRepository` reference in controller. |
| 4 | USER-role employee can open OrgTreePickerModal and see the full department/user tree without 403 | VERIFIED (code) | OrgTreePickerModal.tsx imports `organizationApi`, calls `organizationApi.getTree()` hitting `/organization/departments`. No `departmentApi` reference remains. Needs human confirmation at runtime. |
| 5 | Pending approvals list renders correct dates (not 'Invalid Date') and department names (not blank) | VERIFIED (code) | PendingApprovalResponse type has `createdAt` and `departmentName`. PendingApprovalsPage.tsx uses `item.createdAt?.slice(0, 10)` and `item.departmentName`. No stale field names remain. |
| 6 | Dashboard pending list renders correct dates and department names | VERIFIED (code) | PendingList.tsx uses `new Date(item.createdAt).toLocaleDateString('ko-KR')`. No `submittedAt` or `drafterDepartmentName` references remain. |
| 7 | PendingApprovalsPage is accessible at /approvals/pending route | VERIFIED | App.tsx line 67: `<Route path="/approvals/pending" element={<PendingApprovalsPage />} />` inside ProtectedRoute > MainLayout. Import confirmed at line 15. |
| 8 | CompletedDocumentsPage is accessible at /approvals/completed route | VERIFIED | App.tsx line 68: `<Route path="/approvals/completed" element={<CompletedDocumentsPage />} />`. Import confirmed at line 16. |
| 9 | MainNavbar has approval navigation links (결재 대기, 완료된 문서) | VERIFIED | MainNavbar.tsx lines 43-68: two NavLink elements with `to="/approvals/pending"` (text "결재 대기") and `to="/approvals/completed"` (text "완료된 문서"). ClipboardCheck and CheckCircle icons imported. |
| 10 | DocumentEditorPage renders ApprovalLineEditor below the form | VERIFIED | DocumentEditorPage.tsx lines 207-213: `<ApprovalLineEditor items={approvalLineItems} onChange={setApprovalLineItems} drafterId={user?.id ?? 0} />` inside a `mt-6` div below the form container. Import at line 7. |
| 11 | DocumentDetailPage renders ApprovalLineTimeline instead of placeholder text | VERIFIED | DocumentDetailPage.tsx lines 116-126: conditional render — `ApprovalLineTimeline` shown when `doc.approvalLines && doc.approvalLines.length > 0`, otherwise contextual empty state. Import at line 6. |

**Score:** 10/10 truths verified (truths 7-11 are from Plan 09-03 gap closure; 1-6 from Plans 09-01 and 09-02)

### Known Intentional Stubs

These are documented deviations accepted by the plan — not gaps:

| Stub | Location | Reason | Phase Closing It |
|------|----------|--------|-----------------|
| ApprovalLineEditor local state only (not persisted to backend) | DocumentEditorPage.tsx line 35 | Backend save API for approval lines not yet built | Phase 7 |
| `doc.approvalLines` always undefined (backend does not return it yet) | DocumentDetailPage.tsx line 116 | Backend does not include approvalLines in DocumentDetailResponse yet | Phase 7 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/main/java/com/micesign/service/ApprovalService.java` | Fixed getCompletedApprovals using actedLines document IDs | VERIFIED | Contains `findByIdInAndStatusIn`, no drafter-based query |
| `backend/src/main/java/com/micesign/service/DocumentService.java` | Audit log call in rewriteDocument | VERIFIED | `auditLogService.log(userId, AuditAction.DOC_REWRITE, ...)` at line 174 |
| `backend/src/main/java/com/micesign/common/AuditAction.java` | DOC_REWRITE constant | VERIFIED | Line 17: `public static final String DOC_REWRITE = "DOC_REWRITE"` |
| `backend/src/main/java/com/micesign/controller/AuditLogController.java` | Delegated search via AuditLogService | VERIFIED | Injects AuditLogService, calls `auditLogService.search()` at line 35, no `userRepository` |
| `backend/src/main/java/com/micesign/repository/DocumentRepository.java` | findByIdInAndStatusIn method | VERIFIED | Line 17: `Page<Document> findByIdInAndStatusIn(List<Long> ids, List<DocumentStatus> statuses, Pageable pageable)` |
| `frontend/src/features/approval/api/organizationApi.ts` | API client calling /organization/departments | VERIFIED | `const BASE = '/organization'`, getTree() and getMembers() methods |
| `frontend/src/features/approval/components/OrgTreePickerModal.tsx` | Uses organizationApi (not admin departmentApi) | VERIFIED | Imports `organizationApi` at line 5, calls `organizationApi.getTree()` |
| `frontend/src/features/approval/types/approval.ts` | PendingApprovalResponse with createdAt and departmentName | VERIFIED | Lines 38 and 41: `departmentName: string` and `createdAt: string` |
| `frontend/src/features/approval/pages/PendingApprovalsPage.tsx` | Table rendering with item.createdAt and item.departmentName | VERIFIED | Lines 104 and 109: `item.departmentName` and `item.createdAt?.slice(0, 10)` |
| `frontend/src/features/dashboard/components/PendingList.tsx` | Dashboard list with item.createdAt | VERIFIED | Line 95: `new Date(item.createdAt).toLocaleDateString('ko-KR')` |
| `frontend/src/App.tsx` | Routes for approval pages | VERIFIED | Lines 15-16 (imports), lines 67-68 (routes inside ProtectedRoute > MainLayout) |
| `frontend/src/layouts/MainNavbar.tsx` | Approval menu navigation links | VERIFIED | Lines 43-68: two NavLink elements with correct paths and Korean text |
| `frontend/src/features/document/pages/DocumentEditorPage.tsx` | ApprovalLineEditor integrated | VERIFIED | Lines 7-8 (imports), lines 207-213 (render with correct props) |
| `frontend/src/features/document/pages/DocumentDetailPage.tsx` | ApprovalLineTimeline replacing placeholder | VERIFIED | Line 6 (import), lines 116-126 (conditional render) |
| `frontend/src/features/document/types/document.ts` | DocumentDetailResponse with optional approvalLines and currentStep | VERIFIED | Lines 28-29: `approvalLines?: ApprovalLineResponse[]` and `currentStep?: number | null` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ApprovalService.getCompletedApprovals | DocumentRepository.findByIdInAndStatusIn | actedLines document IDs extracted and queried | WIRED | actedLines -> docIds extraction -> findByIdInAndStatusIn call confirmed |
| DocumentService.rewriteDocument | AuditLogService.log | DOC_REWRITE audit action | WIRED | `auditLogService.log(userId, AuditAction.DOC_REWRITE, ...)` at line 174 |
| AuditLogController.searchAuditLogs | AuditLogService.search | service delegation | WIRED | Constructor injects AuditLogService, method calls `auditLogService.search()` |
| OrgTreePickerModal.tsx | /api/v1/organization/departments | organizationApi.getTree() | WIRED | Import confirmed, `organizationApi.getTree()` call replaces admin endpoint |
| PendingApprovalsPage.tsx | PendingApprovalResponse | item.createdAt and item.departmentName | WIRED | Correct field references in JSX at lines 104 and 109 |
| MainNavbar.tsx | /approvals/pending | NavLink element | WIRED | NavLink with `to="/approvals/pending"` and text "결재 대기" at line 44 |
| App.tsx | PendingApprovalsPage | Route element | WIRED | Route at line 67 inside MainLayout route group |
| DocumentEditorPage.tsx | ApprovalLineEditor | component import and render | WIRED | Import at line 7, render at lines 208-212 with items/onChange/drafterId props |
| DocumentDetailPage.tsx | ApprovalLineTimeline | component import and render | WIRED | Import at line 6, conditional render at lines 117-121 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| ApprovalLineEditor in DocumentEditorPage | `approvalLineItems` | `useState([])` — local state only | No (intentional stub — Phase 7 adds persistence) | HOLLOW (intentional, documented) |
| ApprovalLineTimeline in DocumentDetailPage | `doc.approvalLines` | DocumentDetailResponse from backend | No (backend does not include field yet — Phase 7 adds it) | HOLLOW (intentional, documented) |
| PendingApprovalsPage | `items` from `usePendingApprovals()` | TanStack Query fetching `/approvals/pending` API | Yes (backend returns real DB data when endpoint is called) | FLOWING (pending runtime confirmation) |
| PendingList in Dashboard | `item.createdAt` | Dashboard pending API response | Yes (field renamed to match backend record) | FLOWING (pending runtime confirmation) |

### Behavioral Spot-Checks

Step 7b: SKIPPED — requires running backend server with MariaDB database and authenticated session. No runnable entry points available without server startup.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUD-01 | 09-01 | System records immutable audit log entries for all document state changes | SATISFIED (partial) | DOC_REWRITE action added and wired into rewriteDocument(). Broader AUD-01 coverage from Phase 8. |
| APR-01 | 09-02 | User can build an approval line selecting approvers from org tree | SATISFIED (partial) | OrgTreePickerModal calls /organization/departments (USER role accessible). Broader APR-01 from Phase 7. |
| DASH-01 | 09-02 | User sees a list of documents pending their approval action | SATISFIED (partial) | PendingApprovalResponse type aligned with backend (createdAt, departmentName). Broader DASH-01 from Phase 8. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| DocumentEditorPage.tsx | 35 | `useState<ApprovalLineItem[]>([])` — local state not persisted | Info | Intentional and documented stub; Phase 7 adds backend persistence |
| DocumentDetailPage.tsx | 116 | `doc.approvalLines` always undefined until backend Phase 7 | Info | Intentional and documented stub; conditional rendering handles it cleanly |

No blockers or warnings found. Both patterns are intentional stubs explicitly documented in 09-03-SUMMARY.md.

### Human Verification Required

All 4 original human verification items from the initial verification remain required (code is correct but runtime behavior needs confirmation). Two additional items are now unblocked by the gap closure:

### 1. OrgTreePickerModal Authorization Test

**Test:** Log in as USER role, navigate to document creation, click the approval line selector to open OrgTreePickerModal.
**Expected:** Department tree loads successfully with all departments and users. No 403 error.
**Why human:** Requires running server with USER-role session to confirm endpoint authorization works end-to-end.

### 2. Pending Approvals Date/Department Rendering

**Test:** Navigate to /approvals/pending (now routable via navbar "결재 대기") with at least one pending approval in the database.
**Expected:** Dates show as YYYY-MM-DD format (not "Invalid Date"), department names display correctly (not blank).
**Why human:** Requires real pending approval data in the database and visual inspection of rendered output.

### 3. Dashboard Pending List Rendering

**Test:** Check dashboard pending list widget with pending approval data.
**Expected:** Dates render in Korean locale format, department names display correctly.
**Why human:** Requires running frontend with live backend data to verify rendering.

### 4. DOC_REWRITE Audit Trail

**Test:** Execute rewrite workflow: create draft, submit, have it rejected, then rewrite from rejected document.
**Expected:** Audit log contains a DOC_REWRITE entry with sourceDocId and sourceDocNumber metadata.
**Why human:** Requires full multi-step workflow execution across the approval lifecycle.

### 5. Approval Navbar Links and Page Navigation (Newly Unblocked)

**Test:** Log in as any authenticated user. Verify "결재 대기" and "완료된 문서" links appear in the top navbar. Click each link.
**Expected:** Both links are visible to all authenticated users (not admin-gated). Clicking "결재 대기" navigates to /approvals/pending; clicking "완료된 문서" navigates to /approvals/completed.
**Why human:** Requires running frontend with authenticated session to verify navbar rendering and navigation.

### 6. ApprovalLineEditor in DocumentEditorPage (Newly Unblocked)

**Test:** Navigate to document creation (e.g., /documents/new/GENERAL). Verify the approval line editor appears below the document form. Try adding an approver.
**Expected:** ApprovalLineEditor renders below the form. OrgTreePickerModal opens when clicking "+" and shows the department tree. Approvers can be added to the approval line (local state only — not persisted yet).
**Why human:** Requires running frontend with authenticated session and visual verification of component rendering.

### Gaps Summary

No gaps remain from the previous verification. GAP-09-01 (approval UI components completely disconnected from application) is fully closed by Plan 09-03:

- PendingApprovalsPage routed at /approvals/pending — CLOSED
- CompletedDocumentsPage routed at /approvals/completed — CLOSED
- MainNavbar "결재 대기" and "완료된 문서" links — CLOSED
- ApprovalLineEditor integrated into DocumentEditorPage — CLOSED
- ApprovalLineTimeline replaces placeholder in DocumentDetailPage — CLOSED

All 10 observable truths are code-verified. Phase goal is achieved at the code level. Runtime confirmation requires human testing of 6 items (4 original + 2 newly unblocked).

---

_Verified: 2026-04-10T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
