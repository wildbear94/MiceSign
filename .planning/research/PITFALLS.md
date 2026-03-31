# Pitfalls Research: MiceSign

**Domain:** In-house electronic approval (전자 결재) system
**Date:** 2026-03-31
**Confidence:** HIGH

## Critical Pitfalls (Must Address)

### 1. Document Numbering Race Condition (채번 충돌)

**What goes wrong:** Two users submit documents simultaneously → both get the same sequence number.

**Why:** Without proper locking, `SELECT max(sequence) + 1` is not atomic.

**Prevention:**
- Use `SELECT ... FOR UPDATE` on `doc_sequence` table row within a transaction
- The `doc_sequence` table must have a unique constraint on `(template_code, year)`
- Assign number only at SUBMITTED transition, never at DRAFT

**Phase:** Document Core (numbering implementation)

### 2. Approval State Machine Race Conditions

**What goes wrong:** Double-click on approve button, or concurrent approve + withdraw on same document.

**Why:** Without locking, two threads can both read "PENDING" status and both execute transitions.

**Prevention:**
- Pessimistic lock (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) on the approval_line row being processed
- Idempotency check: verify current status before transition (reject if already processed)
- Frontend: disable button immediately on click + debounce

**Phase:** Approval Workflow

### 3. Document Immutability Enforcement Gaps

**What goes wrong:** API allows document body/attachment/approval line edits after SUBMITTED status.

**Why:** Without explicit enforcement, standard CRUD endpoints don't check document status.

**Prevention:**
- Service layer must check `document.status == DRAFT` before any mutation
- Separate "view" and "edit" DTOs — edit endpoints reject non-DRAFT documents
- Integration tests for every mutation endpoint with SUBMITTED document → expect 400/409

**Phase:** Document Core

### 4. JWT Refresh Token Rotation Stampede

**What goes wrong:** Access token expires → multiple concurrent API calls all get 401 → all trigger refresh simultaneously → only first succeeds, rest get invalid token errors → user logged out.

**Why:** Refresh token rotation invalidates the old token immediately, but concurrent requests still hold it.

**Prevention:**
- Axios interceptor must queue concurrent 401s and retry after single refresh
- Pattern: first 401 triggers refresh, subsequent 401s wait for refresh promise to resolve
- Consider a small grace period (e.g., 30 seconds) where the old refresh token is still valid

**Phase:** Auth module (Axios interceptor design)

### 5. Google Drive API as Single Point of Failure

**What goes wrong:** Google Drive API is down or quota exceeded → file uploads fail → users can't submit documents with attachments.

**Why:** External service dependency with rate limits (queries/second, storage quota).

**Prevention:**
- File upload should be a separate step from document submission
- Documents without attachments must still be submittable during Drive outages
- Implement retry with exponential backoff (max 3 retries)
- Monitor Drive API quota usage
- Service Account daily limit: ~1 billion queries (unlikely to hit), but per-second rate limits can trigger

**Phase:** File management module

## Moderate Pitfalls (Should Address)

### 6. Step Order Logic with Mixed APPROVE/AGREE Types

**What goes wrong:** Approval line has mixed APPROVE and AGREE types at different step_orders → system processes them incorrectly or skips steps.

**Why:** The logic for "who is the next approver" must handle both types identically in terms of ordering, despite different display labels.

**Prevention:**
- Treat APPROVE and AGREE identically in step processing logic
- Only REFERENCE type is different (no approval action needed)
- Test with mixed approval lines: APPROVE(step 1) → AGREE(step 2) → APPROVE(step 3)

**Phase:** Approval Workflow

### 7. Withdrawal Race with Approval Processing

**What goes wrong:** Drafter clicks "withdraw" while an approver is simultaneously clicking "approve" → both succeed → inconsistent state.

**Why:** Withdrawal check ("next approver hasn't acted") and approval action operate on different rows.

**Prevention:**
- Lock the document row when processing withdrawal
- Re-check withdrawal eligibility after acquiring lock
- Approval processing should also check document status (not just approval_line status)

**Phase:** Approval Workflow

### 8. Access Token Lost on Page Refresh

**What goes wrong:** User refreshes browser → Zustand in-memory store cleared → access token lost → appears logged out despite having valid refresh token cookie.

**Why:** Access token stored in memory (correct for security) but not rehydrated on refresh.

**Prevention:**
- On app initialization, always call refresh token endpoint to get new access token
- Show loading spinner during this initial auth check
- Handle case where refresh token is also expired (redirect to login)

**Phase:** Auth module (frontend)

### 9. Audit Log Performance Degradation

**What goes wrong:** Audit log table grows unbounded → queries slow down → system-wide impact.

**Why:** Every document view, state change, login generates a log entry. 50 users × multiple daily actions = significant growth over months.

**Prevention:**
- Add composite indexes on `(action, created_at)` and `(document_id, created_at)`
- Consider partitioning by month/quarter if log volume is high
- Never query audit_log without date range filters in the UI
- Archive old logs periodically (Phase 1-C concern)

**Phase:** Foundation (schema design), later Phase 1-C (UI)

### 10. Resubmission Creating Orphaned Approval Chains

**What goes wrong:** User resubmits from a rejected document → new document created with copied content → old approvers referenced in new approval line may be INACTIVE/RETIRED.

**Why:** Approval line is copied from the original document, but user statuses may have changed.

**Prevention:**
- When creating a resubmission, validate all approval line members are still ACTIVE
- If any are inactive, warn user and require them to update the approval line
- Never auto-copy approval lines without validation

**Phase:** Document Core (resubmission feature)

### 11. Spring @Transactional Proxy Self-Invocation

**What goes wrong:** Method A calls Method B within the same class — both have @Transactional — Method B's transaction annotation is ignored.

**Why:** Spring AOP proxy only intercepts external calls. Self-invocation bypasses the proxy.

**Prevention:**
- Keep transaction boundaries at service method level (one @Transactional per entry point)
- Avoid calling other @Transactional methods within the same class
- Critical for: document numbering (must be in its own transaction) and approval processing

**Phase:** All phases (coding discipline)

## Minor Pitfalls (Good to Know)

### 12. Korean Text Encoding Issues

**What goes wrong:** Korean characters corrupted in database or API responses.

**Prevention:**
- MariaDB: `utf8mb4` charset + `utf8mb4_unicode_ci` collation (already in PRD)
- JDBC URL: add `characterEncoding=UTF-8&useUnicode=true`
- Spring Boot: `spring.servlet.encoding.charset=UTF-8`

**Phase:** Foundation (DB + app config)

### 13. CORS/Cookie Configuration for JWT

**What goes wrong:** Refresh token cookie not sent in dev (different ports) or not accepted due to SameSite policy.

**Prevention:**
- Dev: Configure CORS to allow `localhost:5173` (Vite) → `localhost:8080` (Spring)
- Dev: Set `SameSite=Lax` (not `Strict`) for cross-origin dev setup, or use Vite proxy
- Prod: Same domain, `SameSite=Strict` works fine

**Phase:** Auth module

### 14. Approval Line Editor UX Complexity

**What goes wrong:** Approval line editor is confusing → users set wrong approval order → wrong people approve documents.

**Prevention:**
- Clear visual distinction between APPROVE, AGREE, REFERENCE types
- Drag-and-drop or number-based ordering
- Preview the approval sequence before submission
- Org tree picker for selecting approvers (not free-text search only)

**Phase:** Approval Workflow (UI)

### 15. Solo Developer Overengineering

**What goes wrong:** Building infrastructure for scale that will never come → delayed delivery, increased complexity.

**Prevention:**
- No microservices, no event sourcing, no CQRS
- No dynamic form builder
- No complex caching layer (50 users don't need Redis)
- Build the simplest thing that works, add complexity only when proven necessary

**Phase:** All phases (mindset)
