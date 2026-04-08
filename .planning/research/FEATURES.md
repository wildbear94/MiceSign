# Feature Landscape

**Domain:** Electronic Approval System (전자 결재) for in-house use (~50 employees)
**Researched:** 2026-03-31
**Confidence:** HIGH (based on PRD v2.0, FSD v1.0, and domain expertise in Korean corporate workflow systems)

## Table Stakes

Features users expect from any electronic approval system. Missing any of these means the system cannot replace Docswave.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Authentication (login/logout/token refresh)** | Cannot use system without it | Medium | JWT stateless auth already spec'd. Account lockout (5 fails / 15min) is important for corporate security posture. |
| **Document drafting with form templates** | Core purpose of the system | Medium | 3 MVP forms (GENERAL, EXPENSE, LEAVE). Hardcoded React components -- correct for MVP, avoids dynamic form builder complexity. |
| **Draft save (임시저장)** | Users expect to save work-in-progress before submitting | Low | DRAFT state with no doc number. Essential -- users will lose trust if work disappears. |
| **Approval line selection (결재선 지정)** | Defining who approves is the fundamental workflow act | High | This is the hardest UX component. Org tree browser + search + drag-and-drop ordering + type assignment (APPROVE/AGREE/REFERENCE). Invest heavily here. |
| **Sequential approval processing** | Core workflow engine | High | State machine: DRAFT -> SUBMITTED -> APPROVED/REJECTED/WITHDRAWN. Must handle edge cases (withdrawals, rejections, re-drafting). |
| **Document immutability after submission** | Legal and audit requirement in Korean corporate culture | Low | Lock body + attachments + approval line after SUBMITTED. Non-negotiable. |
| **Approve/Reject with comments** | Approvers need to provide reasoning, especially on rejections | Low | Reject comment should be mandatory. Approve comment optional. |
| **Document withdrawal (회수)** | Drafters need to pull back mistaken submissions | Medium | Only before next approver acts. Creates WITHDRAWN state (not revert to DRAFT). |
| **Re-draft from rejected/withdrawn (재기안)** | Users should not re-type entire documents | Low | Copy content to new document with fresh doc number. Essential UX. |
| **Document numbering (채번)** | Corporate traceability requirement | Low | Format: PREFIX-YEAR-SEQUENCE. Assigned at submission, not draft. |
| **File attachments** | Most approval docs need supporting evidence | Medium | Google Drive API integration. 50MB per file, 200MB per doc, 10 files max. |
| **My Documents inbox (내 문서함)** | Users need to find their own submissions | Low | Filter by status (DRAFT, SUBMITTED, APPROVED, REJECTED, WITHDRAWN). |
| **Pending approvals inbox (결재 대기함)** | Approvers must see what needs their action | Low | Most critical inbox -- this drives daily workflow. Badge count on nav. |
| **Completed approvals inbox (결재 완료함)** | Approvers need to review past decisions | Low | Historical reference. |
| **Reference documents inbox (참조 문서함)** | CC'd users need access to referenced documents | Low | Read-only access, no action required. |
| **Dashboard (대시보드)** | Landing page showing actionable summary | Medium | Pending count, recent docs, quick links. First thing users see. |
| **Organization management (부서/직급/사용자)** | Admin must configure org structure before anyone can use the system | Medium | Department tree, position hierarchy, user CRUD. Prerequisite for everything else. |
| **RBAC (역할 기반 접근 제어)** | Corporate systems require role-based permissions | Medium | SUPER_ADMIN / ADMIN / USER. Controls who sees what. |
| **Password management** | Users must change passwords; admins must reset them | Low | Self-service change + admin reset with temp password. |
| **Audit trail (감사 로그 기록)** | Corporate compliance -- all actions must be traceable | Medium | Backend logging of all state changes. UI for querying is Phase 1-C, but recording starts in Phase 1-A. |
| **Document viewing permissions** | Confidential docs must not leak to unauthorized users | Medium | Drafter, approval line members, REFERENCE targets, ADMIN (dept scope), SUPER_ADMIN (all). |

## Differentiators

Features that elevate the system beyond basic approval. Not strictly required for MVP, but create real value for a small company.

| Feature | Value Proposition | Complexity | Phase | Notes |
|---------|-------------------|------------|-------|-------|
| **Email notifications (SMTP)** | Users don't have to constantly check the system for pending items | Medium | 1-B | Event-driven async. High impact for adoption -- without this, approvals stall because people forget to check. |
| **Document search/filtering** | Find any document by keyword, date range, template type, status | Medium | 1-B | Essential once document volume grows past ~100 docs. Not needed for first week of use. |
| **Approval line favorites (자주 쓰는 결재선)** | Save commonly used approval chains; huge time-saver for repetitive forms | Low | P2 | Low effort, high UX value. Consider pulling into Phase 1-B. |
| **Statistics and reports** | Approval turnaround times, rejection rates, department volumes | Medium | 1-C | Valuable for management oversight. Shows the system is more than just Docswave replacement. |
| **Audit log query UI** | SUPER_ADMIN can investigate any action with filters | Medium | 1-C | Backend already logging in P1A; this just adds the frontend. |
| **Retirement/handover processing** | Clean handling of departing employees' pending approvals | Medium | 1-C | Bulk WITHDRAWN for drafter exits, SKIPPED for approver exits. Small company but still needed. |
| **Additional form templates** | Purchase request, business trip report, overtime request | Low each | 1-B | Each is a new React component. Hardcoded approach makes adding forms straightforward. |
| **Forced password change on first login** | Security best practice after admin creates temp password | Low | 1-B | Small effort, meaningful security improvement. |
| **Read/unread status for reference docs** | Users know which reference docs they haven't read yet | Low | 1-B | Simple boolean flag per user per doc. Nice quality-of-life feature. |
| **AI-assisted document drafting** | Auto-generate initial draft based on historical documents | High | P2 | The long-term differentiator. Requires substantial document corpus first. Only meaningful after 6+ months of data. |
| **Proxy approval (대결/위임)** | Designated person approves on behalf of absent approver | Medium | P2 | Common in Korean corporate systems. Important for vacation coverage, but adds complexity to the state machine. |
| **PDF export/print template** | Generate printable document with approval stamps | Medium | P2 | Some departments want physical records. Korean corporate culture still values printed approvals for certain docs. |
| **In-app real-time notifications (WebSocket/SSE)** | Instant notification without email dependency | High | P2 | Over-engineering for 50 users. Email + dashboard badge is sufficient. |
| **Parallel approval (병렬 합의)** | Multiple agreers process simultaneously instead of sequentially | Medium | P2 | Adds significant state machine complexity. Sequential is simpler and adequate for ~50 users. |

## Anti-Features

Features to explicitly NOT build. Each would add complexity without proportional value for a 50-person company.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Dynamic form builder** | Massive complexity (drag-and-drop field editor, validation engine, conditional logic). Only justified at 500+ users or SaaS product. | Hardcoded React components per template. Adding a new form is a developer task (~2-4 hours), not an admin task. Perfectly acceptable at this scale. |
| **Automatic approval routing rules** | Rule engines (if amount > X then add department head, etc.) add tremendous complexity and edge cases. Korean corporate culture values explicit human decision on approval lines. | 100% manual approval line selection by drafter. This is already the spec and it is correct. |
| **Mobile native app** | React Native or Flutter app for ~50 users is unjustifiable cost. | Responsive web. Desktop-first, but ensure approve/reject works on mobile browser for P1A. |
| **SSO / OAuth / LDAP integration** | Over-engineering for a small company that doesn't have an identity provider. | Simple email + password with JWT. Revisit only if company adopts Google Workspace or similar. |
| **Document versioning** | Tracking diffs between versions adds storage and UI complexity. | Immutable-after-submission model. Need changes? Withdraw and re-draft. Clean and auditable. |
| **Complex notification preferences** | Per-user notification channel/frequency settings. | Send email for all approval events. No opt-out needed at this scale -- approvals are mandatory workflows. |
| **Multi-language support (i18n)** | All users are Korean speakers in a Korean company. | Korean UI only. Mixed Korean/English in code is fine per project conventions. |
| **Data migration from Docswave** | Legacy data is messy and the effort to map old schemas exceeds the value. | Fresh start (clean start). Already confirmed in PRD. Old data stays in Docswave for historical reference. |
| **Workflow branching / conditional steps** | "If rejected by step 2, skip to step 5" type logic adds enormous state machine complexity. | Linear sequential approval only. Rejection terminates the workflow. Re-draft if needed. |
| **Bulk approval (일괄 결재)** | Approving multiple documents at once encourages rubber-stamping and defeats the purpose of review. | One-at-a-time approval with mandatory review of document content. |
| **Docker containerization** | Added infrastructure complexity with no benefit for a single-server deployment. | Native deployment: Spring Boot JAR via systemd, React static via Nginx. Simple and sufficient. |

## Feature Dependencies

```
Organization Management (departments, positions, users)
  --> Authentication (users must exist to log in)
    --> Dashboard (landing page after login)
    --> Document Drafting (logged-in user creates documents)
      --> Approval Line Selection (select approvers from org tree)
        --> Document Submission (lock + number + start workflow)
          --> Approval Processing (approve/reject by approvers)
            --> Document Completion (APPROVED/REJECTED terminal states)
          --> Document Withdrawal (drafter pulls back before next step)
        --> Re-draft (copy rejected/withdrawn content to new draft)
      --> File Attachments (attach to draft before submission)

Audit Trail Recording (P1A) --> Audit Trail Query UI (P1C)
Email Notifications (P1B) --> depends on Authentication + Approval Processing
Document Search (P1B) --> depends on Documents existing (data volume)
Statistics (P1C) --> depends on sufficient approval history data
```

**Critical path for MVP:** Organization setup -> Auth -> Document drafting + Approval line editor -> Submission + Approval workflow -> Dashboard

The approval line editor (FN-APR-005) is the most complex single UI component and sits on the critical path. It depends on the organization tree being populated, so org management must be built first.

## MVP Recommendation

### Must ship in Phase 1-A (34 functions per FSD):

1. **Authentication** -- FN-AUTH-001 through FN-AUTH-005
2. **Organization management** -- FN-ORG-001 through FN-ORG-008
3. **Form templates** -- FN-TPL-001, FN-TPL-003 (GENERAL, EXPENSE, LEAVE)
4. **Document lifecycle** -- FN-DOC-001 through FN-DOC-009
5. **Approval processing** -- FN-APR-001 through FN-APR-005
6. **File management** -- FN-FILE-001 through FN-FILE-003
7. **Dashboard** -- FN-DASH-001
8. **Audit logging (backend)** -- FN-AUD-001

### Defer to Phase 1-B:

- **Email notifications** (FN-NTF-001): High impact but not blocking. Users can check dashboard manually for the first week.
- **Document search** (FN-SEARCH-001): Not needed until document volume grows.
- **Additional templates**: PURCHASE, BUSINESS_TRIP, OVERTIME -- add incrementally.
- **Password change enforcement on first login**: Security improvement, low effort.

### Defer to Phase 1-C:

- **Audit log query UI** (FN-AUD-002): Backend is already logging; frontend can wait.
- **Statistics/reports**: Needs data to be useful.
- **Retirement/handover processing** (FN-ORG-009): Edge case that can be handled manually initially.

### Defer to Phase 2 or later:

- **AI document assistance**: Requires 6+ months of document corpus.
- **Proxy/delegation approval**: Complex state machine changes.
- **PDF export**: Nice-to-have, not urgent.
- **Approval line favorites**: Low complexity -- consider pulling to 1-B if time allows.

## Risk Notes

| Feature Area | Risk | Mitigation |
|--------------|------|------------|
| Approval line editor UX | Most complex frontend component. Bad UX here kills adoption. | Prototype and test with 2-3 actual users before building all other features. Org tree search must be fast and intuitive. |
| Google Drive API reliability | External dependency for file storage. API rate limits, outages. | Retry with exponential backoff (already in spec). Ensure approval flow works without attachments. |
| Document state machine edge cases | Concurrent actions (withdraw while approver is approving), race conditions | Optimistic locking on document status. Backend must validate state transitions strictly. |
| Form template extensibility | Hardcoded components mean developer effort for each new form | Acceptable at this scale. Create a clear pattern/boilerplate so new forms take 2-4 hours, not days. |

## Sources

- PRD v2.0: `/Volumes/USB-SSD/03-code/VibeCoding/MiceSign/docs/PRD_MiceSign_v2.0.md`
- FSD v1.0: `/Volumes/USB-SSD/03-code/VibeCoding/MiceSign/docs/FSD_MiceSign_v1.0.md`
- PROJECT.md: `/Volumes/USB-SSD/03-code/VibeCoding/MiceSign/.planning/PROJECT.md`
- Domain knowledge: Korean corporate electronic approval systems (전자 결재) are a well-established domain with consistent feature expectations across products like Docswave, Hiworks, Groupware solutions (Hancom, Daou), and enterprise systems (Samsung SDS Brity Works, LG CNS). The table stakes listed above reflect consensus features across these products.
