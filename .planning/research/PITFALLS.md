# Pitfalls Research

**Domain:** Self-registration feature added to existing corporate electronic approval system
**Researched:** 2026-04-07
**Confidence:** HIGH (based on direct codebase analysis + domain knowledge)

## Critical Pitfalls

### Pitfall 1: User Table Schema Mismatch — NOT NULL Columns Block Registration

**What goes wrong:**
The existing `user` table has `employee_no` (NOT NULL, UNIQUE) and `department_id` (NOT NULL) as required columns. Self-registration applicants will not have an employee number or department assignment at registration time. Attempting to store registration requests in the `user` table will fail, and trying to use placeholder values creates data integrity issues.

**Why it happens:**
The natural impulse is to reuse the existing `user` table with a new status like `PENDING`. But the current schema (`V1__create_schema.sql`) enforces `employee_no VARCHAR(20) NOT NULL UNIQUE` and `department_id BIGINT NOT NULL`. Placeholder values (e.g., auto-generated employee numbers) pollute the employee number namespace and confuse admin user management.

**How to avoid:**
Create a separate `registration_request` table with only the fields the applicant provides (name, email, hashed password). On approval, the SUPER_ADMIN assigns employee_no and department_id, and the system creates the actual `user` record. This keeps the `user` table clean and maintains all existing NOT NULL constraints.

**Warning signs:**
- Flyway migration that ALTERs `user` columns to be nullable
- Code that generates fake employee numbers like "PENDING-001"
- `user` table queries breaking because they assume all users have departments

**Phase to address:**
Phase 1 (DB schema design) — the very first step must be deciding the data model.

---

### Pitfall 2: SecurityConfig permitAll() Scope Creep

**What goes wrong:**
The registration endpoint must be unauthenticated (accessible from the login page). Adding it to `SecurityConfig.permitAll()` seems simple, but overly broad patterns like `/api/v1/registration/**` can accidentally expose the admin approval/rejection endpoints to unauthenticated users.

**Why it happens:**
The current SecurityConfig has a tight permitAll list: only `/api/v1/auth/login`, `/api/v1/auth/refresh`, health, and Swagger. Registration needs a new public endpoint, but the approval management endpoints (list pending, approve, reject) must remain behind SUPER_ADMIN authentication. If both are under the same URL prefix, a broad permitAll pattern leaks admin functionality.

**How to avoid:**
Use distinct URL prefixes:
- Public: `/api/v1/auth/register` (POST only) — add to permitAll
- Admin: `/api/v1/admin/registrations/**` — already covered by `.hasAnyRole("SUPER_ADMIN", "ADMIN")` rule

The existing SecurityConfig pattern `.requestMatchers("/api/v1/admin/**").hasAnyRole("SUPER_ADMIN", "ADMIN")` already protects admin routes. Place the admin-side registration management under `/api/v1/admin/` to inherit this protection. Then add `@PreAuthorize("hasRole('SUPER_ADMIN')")` on the controller methods since only SUPER_ADMIN (not ADMIN) should approve registrations.

**Warning signs:**
- Registration endpoints not under `/api/v1/admin/` but still requiring auth
- New permitAll patterns with wildcards
- Manual `@PreAuthorize` on every endpoint instead of leveraging URL-pattern security

**Phase to address:**
Phase 2 (API implementation) — when defining controller endpoints.

---

### Pitfall 3: Duplicate Email Between Registration Requests and Existing Users

**What goes wrong:**
A user submits a registration request with an email that already exists in the `user` table, or submits multiple registration requests with the same email. Without proper cross-table uniqueness checking, this creates conflicts: duplicate accounts on approval, or confusing "email already exists" errors when the admin tries to approve.

**Why it happens:**
The `user` table has a UNIQUE constraint on `email`. If registration requests are stored in a separate table, the uniqueness check must span both tables. The existing `UserManagementService.createUser()` already checks `userRepository.findByEmail()`, but the registration flow must also check pending requests.

**How to avoid:**
At registration submission time, check both:
1. `userRepository.findByEmail()` — reject if email exists in users
2. `registrationRequestRepository.findByEmailAndStatus(PENDING)` — reject if a pending request exists

At approval time, re-check `userRepository.findByEmail()` before creating the user (race condition guard — someone might have been created by admin in the meantime).

**Warning signs:**
- Only checking one table for email uniqueness
- No re-validation at approval time
- Database constraint violation errors in production (instead of graceful business errors)

**Phase to address:**
Phase 2 (API implementation) — registration submission and approval logic.

---

### Pitfall 4: Email Notification System Not Designed for Non-Document Events

**What goes wrong:**
The existing `EmailService` is tightly coupled to document approval events (`ApprovalNotificationEvent` with document ID, approval lines, drafter). Registration notifications (request received, approved, rejected) have nothing to do with documents. Forcing registration notifications through the existing event system creates awkward coupling.

**Why it happens:**
The existing `NotificationEventType` enum contains only document-related events: `SUBMIT, APPROVE, FINAL_APPROVE, REJECT, WITHDRAW`. The `NotificationLog` entity has a `documentId` field. The `sendNotification` method signature expects `ApprovalNotificationEvent`. All of this is document-specific.

**How to avoid:**
Add a separate notification method to `EmailService` — a simple `sendRegistrationEmail(String toEmail, String subject, String templateName, Map<String, Object> variables)` that does not go through the document event pipeline. Log to `notification_log` with `documentId = null` and new event types.

Add new values to `NotificationEventType` enum (`REGISTRATION_RECEIVED, REGISTRATION_APPROVED, REGISTRATION_REJECTED`) and ensure `notification_log.document_id` allows NULL (check current DDL — it may already be nullable).

**Warning signs:**
- Passing fake document IDs to the notification system
- Creating a "registration document" just to satisfy the notification pipeline
- Skipping notification logging for registration emails

**Phase to address:**
Phase 3 (email integration) — when wiring up registration notifications.

---

### Pitfall 5: Approval Creates User But Skips Critical Setup Steps

**What goes wrong:**
When SUPER_ADMIN approves a registration, the system creates a `user` record. But the existing `createUser` flow in `UserManagementService` sets `mustChangePassword = true`, assigns a specific department, employee number, and role. If the approval flow bypasses `UserManagementService` and writes directly to the repository, it misses these business rules.

**Why it happens:**
The registration approval code might create the User entity directly to avoid the `CreateUserRequest` validation (which requires fields the registration flow handles differently). This bypasses the business logic in `UserManagementService.createUser()`.

**How to avoid:**
The approval flow should either:
1. Call `UserManagementService.createUser()` with a properly constructed request (SUPER_ADMIN provides employee_no and department_id at approval time), or
2. Extract shared user creation logic into a private method that both flows call.

Key setup that must not be skipped: `mustChangePassword = true`, password hashing via `passwordEncoder` (note: password should already be hashed at registration submission, so at approval time just transfer the hash — do NOT double-hash), status = `ACTIVE`, role = `USER`.

**Warning signs:**
- User entity created without `mustChangePassword = true`
- Password double-hashed (BCrypt of BCrypt) — user can never log in
- User created with no department assignment

**Phase to address:**
Phase 2 (approval logic) — when implementing the approve endpoint.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store registration requests in `user` table with PENDING status | No new table needed | Nullable columns, fake employee numbers, broken queries that assume all users are real | Never — separate table is minimal effort |
| Skip notification logging for registration emails | Faster implementation | No audit trail for registration communications, inconsistent with existing notification tracking | Never — logging is a few extra lines |
| Hardcode email templates as string concatenation | No template engine dependency | Unmaintainable HTML, no i18n, hard to change formatting | Acceptable for MVP if kept simple — plan to use Thymeleaf templates later |
| Allow ADMIN (not just SUPER_ADMIN) to approve registrations | Broader approval coverage | Contradicts milestone spec (SUPER_ADMIN only), ADMIN role escalation risk | Never for this milestone |
| Skip rate limiting on registration endpoint | Faster implementation | Spam risk if system is exposed to internet | Acceptable if intranet-only; add before any public exposure |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Existing `SecurityConfig` | Adding registration endpoint under a new URL prefix that bypasses existing security rules | Place public endpoint under `/api/v1/auth/register`, admin endpoints under `/api/v1/admin/registrations` to inherit existing security rules |
| Existing `EmailService` | Forcing registration events through `ApprovalNotificationEvent` pipeline | Add a standalone `sendRegistrationEmail()` method that logs to `notification_log` independently |
| Existing `UserManagementService` | Duplicating user creation logic in the registration approval service | Reuse or extract shared logic from `UserManagementService.createUser()` |
| `NotificationEventType` enum | Worrying about DB ENUM type when adding new values | The `notification_log.event_type` column is VARCHAR in the current schema — safe to add new enum values at application level only, no Flyway migration needed for the enum itself |
| Existing `UserRepository` | Missing query method for cross-table email uniqueness | Add `existsByEmail()` check plus `registrationRequestRepository.existsByEmailAndStatus(PENDING)` — two separate checks |
| Frontend `LoginPage` | Adding registration link that breaks the existing layout or auth flow | Add a simple "계정 신청" link below the login form, navigate to a separate `/register` route outside the auth guard |
| Frontend auth routing | Registration page gets caught by the authenticated-only route guard | Registration route must be added to the public routes list alongside `/login` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No rate limiting on registration endpoint | Spam registration requests flood DB and admin queue | IP-based rate limit (5 requests/hour per IP) | Immediately if exposed to internet; low risk on intranet |
| Sending email synchronously during approval | Admin UI freezes during approve/reject action | Use `@Async` pattern (already established in existing `EmailService`) | Even at 1 request — UX issue not scale issue |
| Loading all pending registrations without pagination | Admin page loads slowly if many pending requests accumulate | Use Spring Data `Pageable` from the start (consistent with existing user list pattern) | Unlikely at 50 employees but good practice |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing plaintext password in registration_request table | Password leak from DB access | Hash with BCrypt at registration submission time, store only the hash |
| Double-hashing password at approval time | User can never log in — BCrypt(BCrypt(password)) does not match BCrypt(password) | Transfer the already-hashed password directly from registration_request to user table |
| Registration approval accessible to ADMIN role | ADMIN could approve registrations, bypassing SUPER_ADMIN-only intent | Use `@PreAuthorize("hasRole('SUPER_ADMIN')")` on approval endpoints — the existing `/api/v1/admin/**` URL pattern allows both ADMIN and SUPER_ADMIN |
| Not re-validating email uniqueness at approval time | Race condition: admin creates user with same email between request and approval | Check email uniqueness in `user` table inside the approval transaction |
| Registration endpoint leaks email existence | Attacker discovers valid employee emails | Return generic success message for all submissions; only show format validation errors. Lower priority for intranet |
| No CSRF protection on registration form | Cross-site registration spam | Current setup has CSRF disabled (stateless JWT). Acceptable for API-only approach. Rate limiting covers the spam risk |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback after registration submission | User does not know if request was received, submits multiple times | Show clear success message: "등록 신청이 접수되었습니다. 관리자 승인 후 이용 가능합니다." |
| No way for applicant to check status | User repeatedly asks HR "is my account ready?" | Email notifications cover this — send confirmation on submit, notify on approve/reject |
| Rejection without reason | Rejected applicant does not know why | Require rejection reason from SUPER_ADMIN, include in rejection email |
| Registration form asks for too many fields | Friction discourages registration | Only ask: name, email, password. Department/position/employee_no are admin concerns |
| Password requirements not shown | User gets cryptic validation errors | Show requirements inline on the form, match existing password rules (min 8 chars) |
| SUPER_ADMIN has no notification of new registrations | Pending requests sit unnoticed for days | Send email to all SUPER_ADMIN users when a new registration arrives |
| No batch operations for admin | SUPER_ADMIN must approve/reject one by one when onboarding a group | Add select-all / batch approve for initial launch convenience |

## "Looks Done But Isn't" Checklist

- [ ] **Email uniqueness:** Check against BOTH `user` table AND pending `registration_request` table at submission time
- [ ] **Re-validation at approval:** Check email uniqueness again inside the approval transaction
- [ ] **Password transfer:** Verify hash is transferred directly, not double-hashed
- [ ] **All three email events:** Submission received (to applicant), approved (to applicant), rejected (to applicant with reason)
- [ ] **SUPER_ADMIN notification:** Email sent to SUPER_ADMIN(s) when new registration arrives
- [ ] **SecurityConfig updated:** Registration submit endpoint in permitAll, approval under SUPER_ADMIN-only auth
- [ ] **Notification logging:** All registration emails logged to `notification_log` table
- [ ] **Audit trail:** Approval/rejection creates `audit_log` entries
- [ ] **Frontend routing:** Registration page accessible without authentication
- [ ] **Existing admin flow unchanged:** Admin "create user" still works after registration feature added
- [ ] **Pending login attempt:** Login with pending-registration email returns meaningful error, not generic "invalid credentials"
- [ ] **Expired/rejected re-registration:** User can submit a new request after previous one was rejected

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stored registrations in `user` table | MEDIUM | Create separate `registration_request` table, migrate pending rows, restore NOT NULL constraints via Flyway |
| Skipped password hashing at registration | HIGH | All pending passwords compromised. Expire them, force re-registration |
| Double-hashed passwords on approved users | MEDIUM | Identify affected users (cannot log in), force password reset for each |
| Admin approval accessible to ADMIN role | LOW | Fix `@PreAuthorize`, audit existing approvals for unauthorized ones |
| No email uniqueness cross-check | LOW | Add the check, reject or expire duplicate pending requests |
| Broke existing user creation flow | MEDIUM | Add integration tests verifying admin user CRUD still works |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| User table schema mismatch | Phase 1: DB schema | `registration_request` table exists as separate Flyway migration; `user` table NOT NULL constraints unchanged |
| SecurityConfig scope creep | Phase 2: API endpoints | Registration submit in permitAll; approval under `/api/v1/admin/` with `@PreAuthorize("hasRole('SUPER_ADMIN')")` |
| Duplicate email cross-table | Phase 2: Business logic | Unit test: submit with existing user email fails; submit with pending request email fails; approve after admin-created same email fails |
| Email system coupling | Phase 3: Email integration | Registration emails logged in `notification_log`; new event types in enum; `documentId` nullable |
| Approval skips user setup | Phase 2: Approval logic | Integration test: approved user has `mustChangePassword=true`, correctly transferred password hash, USER role, ACTIVE status |
| Double-hashed password | Phase 2: Approval logic | Test: register user, approve, login with original password succeeds |
| No applicant feedback | Phase 1: Frontend | Registration form shows success message |
| SUPER_ADMIN not notified | Phase 3: Email integration | Email sent to all active SUPER_ADMIN users on new registration |
| Rejection without reason | Phase 2: Admin UI | Rejection requires reason text; email includes reason |

## Sources

- Direct codebase analysis: `SecurityConfig.java` (line 39-43 — permitAll and admin URL patterns), `User.java` (NOT NULL fields: employee_no, department_id), `UserStatus.java` (only ACTIVE/INACTIVE/RETIRED — no PENDING), `UserManagementService.java` (createUser business rules), `EmailService.java` (document-coupled notification pipeline), `NotificationEventType.java` (document-only events), `CreateUserRequest.java` (required fields), `V1__create_schema.sql` (DDL constraints)
- Existing patterns: event-driven async notifications, RBAC checks, Flyway migrations, BCrypt password encoding

---
*Pitfalls research for: Self-registration feature in MiceSign electronic approval system*
*Researched: 2026-04-07*
