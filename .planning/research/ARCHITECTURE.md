# Architecture Patterns: Self-Registration Integration

**Domain:** Self-registration feature for existing electronic approval system
**Researched:** 2026-04-07
**Confidence:** HIGH (all recommendations based on direct codebase inspection)

## Recommended Architecture

### Design Decision: New `registration_request` Table (Not Extending `user`)

Use a **separate `registration_request` table** rather than adding a "PENDING" status to the existing `user` table. Rationale:

1. **`user` table has `NOT NULL` constraints** on `employee_no` and `department_id` that registration applicants cannot provide. Adding nullable overrides or dummy values pollutes the data model.
2. **`user.employee_no` is UNIQUE** -- applicants do not have employee numbers yet. The admin assigns this after approval.
3. **Clean separation of concerns** -- registration requests are a workflow artifact, not user records. Rejected requests should never appear in user queries, approval line selectors, or org tree pickers.
4. **Existing code safety** -- `UserRepository.findByEmail()`, `UserSpecification`, approval line queries all assume `user` rows are real employees. A "PENDING" status in `user` would require defensive filtering everywhere.

### Component Boundaries

| Component | Responsibility | New/Modified | Communicates With |
|-----------|---------------|--------------|-------------------|
| `registration_request` table | Store pending registration data | **NEW** | DB only |
| `RegistrationRequest` entity | JPA entity for registration requests | **NEW** | Repository |
| `RegistrationRequestRepository` | Data access for registration requests | **NEW** | Service layer |
| `RegistrationController` | Public endpoints for submitting requests | **NEW** | RegistrationService |
| `RegistrationAdminController` | SUPER_ADMIN endpoints for approve/reject | **NEW** | RegistrationService |
| `RegistrationService` | Business logic: submit, approve, reject | **NEW** | UserRepository, EmailService, AuditLog |
| `RegistrationNotificationEvent` | Spring event for registration emails | **NEW** | EmailService (listener) |
| `SecurityConfig` | Add `/api/v1/registration` to permitAll | **MODIFIED** (1 line) | Spring Security |
| `NotificationEventType` enum | Add REGISTRATION_SUBMITTED, REGISTRATION_APPROVED, REGISTRATION_REJECTED | **MODIFIED** | EmailService |
| `EmailService` | Add listener for registration events | **MODIFIED** | NotificationLog |
| Frontend: `RegisterPage` | Registration form on login screen | **NEW** | RegistrationController |
| Frontend: `RegistrationListPage` | Admin page listing pending requests | **NEW** | RegistrationAdminController |
| Frontend: `App.tsx` routes | Add /register route (public), /admin/registrations (protected) | **MODIFIED** | React Router |

### Data Flow

#### Registration Request Submission (Unauthenticated)

```
User (not logged in)
  -> GET /register (frontend route, public)
  -> Fills form: name, email, password
  -> POST /api/v1/registration (permitAll in SecurityConfig)
  -> RegistrationController.submit()
  -> RegistrationService.submitRequest()
     1. Validate email not in `user` table (duplicate check)
     2. Validate email not in `registration_request` with status PENDING (no double-submit)
     3. BCrypt hash password
     4. Save to `registration_request` (status = PENDING)
     5. Publish RegistrationNotificationEvent(type=SUBMITTED)
     6. Audit log: action=REGISTRATION_SUBMITTED
  -> EmailService handles event:
     - Notify all SUPER_ADMINs that a new request arrived
     - Send confirmation email to applicant
  -> Return 201 with success message
```

#### Admin Approval (Authenticated, SUPER_ADMIN only)

```
SUPER_ADMIN
  -> GET /admin/registrations (frontend route)
  -> GET /api/v1/admin/registrations?status=PENDING (paginated list)
  -> Reviews request, clicks Approve
  -> POST /api/v1/admin/registrations/{id}/approve
  -> RegistrationService.approveRequest(id, adminId)
     1. Load RegistrationRequest, verify status == PENDING
     2. Create User from request data:
        - name, email, password (already hashed) from request
        - department_id = default "unassigned" department
        - employee_no = auto-generated placeholder (e.g., "REG-{id}")
        - role = USER
        - status = ACTIVE
        - mustChangePassword = false (user already set their password)
     3. Update RegistrationRequest status = APPROVED, reviewedBy, reviewedAt
     4. Publish RegistrationNotificationEvent(type=APPROVED)
     5. Audit log: action=REGISTRATION_APPROVED
  -> EmailService: notify applicant "Your account has been approved, you can now log in"
  -> Return 200
```

#### Admin Rejection (Authenticated, SUPER_ADMIN only)

```
SUPER_ADMIN
  -> POST /api/v1/admin/registrations/{id}/reject
  -> Body: { "reason": "..." } (optional rejection reason)
  -> RegistrationService.rejectRequest(id, reason, adminId)
     1. Load RegistrationRequest, verify status == PENDING
     2. Update status = REJECTED, rejectionReason, reviewedBy, reviewedAt
     3. Publish RegistrationNotificationEvent(type=REJECTED)
     4. Audit log: action=REGISTRATION_REJECTED
  -> EmailService: notify applicant "Your registration was rejected" (with reason if provided)
  -> Return 200
```

## New Database Table

```sql
-- V14__create_registration_request.sql
CREATE TABLE registration_request (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL COMMENT '신청자 이름',
    email           VARCHAR(150) NOT NULL COMMENT '신청 이메일',
    password        VARCHAR(255) NOT NULL COMMENT 'BCrypt 해시',
    status          ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    rejection_reason VARCHAR(500) NULL COMMENT '거부 사유',
    reviewed_by     BIGINT       NULL COMMENT '처리한 관리자 ID',
    reviewed_at     DATETIME     NULL COMMENT '처리 일시',
    created_user_id BIGINT       NULL COMMENT '승인 후 생성된 user ID (추적용)',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES `user`(id) ON DELETE SET NULL,
    FOREIGN KEY (created_user_id) REFERENCES `user`(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자 등록 신청';
```

**Why this schema:**
- `email` is NOT unique in this table -- a rejected user can re-apply. Uniqueness is enforced in business logic (only one PENDING request per email).
- `password` stored hashed from submission -- no plaintext ever touches the system.
- `created_user_id` provides traceability from request to actual user record.
- No FK to `department` or `position` -- applicants do not choose these.

## New API Endpoints

### Public (Unauthenticated)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/registration` | Submit registration request |

**Request body:**
```json
{
  "name": "홍길동",
  "email": "hong@company.com",
  "password": "securePassword123"
}
```

**Validation rules:**
- name: required, max 50 chars
- email: required, valid email format, max 150 chars
- password: required, min 8 chars, max 100 chars

### Admin (SUPER_ADMIN only)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/admin/registrations` | List registration requests (paginated, filterable by status) |
| `GET` | `/api/v1/admin/registrations/{id}` | Get single request detail |
| `POST` | `/api/v1/admin/registrations/{id}/approve` | Approve request, create user |
| `POST` | `/api/v1/admin/registrations/{id}/reject` | Reject request |

**Note:** Admin endpoints go under `/api/v1/admin/` which is already secured by `SecurityConfig` line 42: `.requestMatchers("/api/v1/admin/**").hasAnyRole("SUPER_ADMIN", "ADMIN")`. However, registration approval should be **SUPER_ADMIN only** -- use `@PreAuthorize("hasRole('SUPER_ADMIN')")` on the controller, not the path-level config.

## SecurityConfig Modification

Single change needed in `SecurityConfig.filterChain()`:

```java
.requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
// ADD THIS LINE:
.requestMatchers("/api/v1/registration").permitAll()
```

This permits only `POST /api/v1/registration` (the submit endpoint). All admin registration endpoints remain behind authentication via the existing `/api/v1/admin/**` rule.

## Integration with Existing Email Infrastructure

### Existing Pattern (reuse this)
The system uses `ApplicationEventPublisher` -> `@TransactionalEventListener` + `@Async` pattern. The `EmailService` listens for `ApprovalNotificationEvent` after commit.

### New Event: `RegistrationNotificationEvent`

```java
public class RegistrationNotificationEvent {
    private final Long registrationRequestId;
    private final String eventType; // REGISTRATION_SUBMITTED, REGISTRATION_APPROVED, REGISTRATION_REJECTED
    private final Long actorId;     // null for submission (unauthenticated), admin ID for approve/reject
}
```

**Add a new listener method in `EmailService`** (or create a dedicated `RegistrationEmailService`):

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async
public void sendRegistrationNotification(RegistrationNotificationEvent event) {
    // Handle SUBMITTED -> email to all SUPER_ADMINs + confirmation to applicant
    // Handle APPROVED -> email to applicant
    // Handle REJECTED -> email to applicant with reason
}
```

### NotificationLog Consideration

The existing `notification_log` table has `recipient_id BIGINT NOT NULL` with a FK to `user`. Registration notification recipients who are not yet users (the applicant on submission) cannot be logged in this table.

**Two options:**
1. **Make `recipient_id` nullable** via migration -- allows logging emails to non-users. Simple but breaks the FK semantics.
2. **Log only SUPER_ADMIN notifications in `notification_log`**, skip logging applicant emails (they are not users yet). After approval, subsequent emails to the new user can be logged normally.

**Recommendation:** Option 2. The applicant is not a user yet. Log the SUPER_ADMIN notification (they are users). For the applicant confirmation email, just log it at INFO level. After the user is created (approval), all future emails can use `notification_log` normally. This avoids schema changes to `notification_log`.

### Email Templates (Thymeleaf)

Create 4 new templates in `src/main/resources/templates/email/`:

| Template | Recipient | Variables |
|----------|-----------|-----------|
| `registration-submitted.html` | Applicant (confirmation) | applicantName |
| `registration-submitted-admin.html` | SUPER_ADMINs | applicantName, applicantEmail, reviewUrl |
| `registration-approved.html` | Applicant | applicantName, loginUrl |
| `registration-rejected.html` | Applicant | applicantName, rejectionReason |

## Integration with Existing User Creation

### The `employee_no` Problem

The `user` table requires `employee_no NOT NULL UNIQUE`. Self-registered users do not have employee numbers. Options:

1. **Auto-generate a temporary employee_no** like `REG-{requestId}`. Admin updates it later via existing user management UI.
2. **Make `employee_no` nullable** via migration. Simpler but changes a core invariant.
3. **Create a seed "미배정" (Unassigned) department** for `department_id`.

**Recommendation:** Option 1 for `employee_no` (auto-generate, admin fixes later) + create a default "미배정" (Unassigned) department via seed migration for `department_id`. This avoids schema changes to the `user` table itself.

### Approval Flow Creates User Directly

The `RegistrationService.approveRequest()` method creates a `User` object directly (not through `UserManagementService.createUser()`) because:
- `CreateUserRequest` requires `employeeNo`, `departmentId`, `role` -- fields the admin is not providing during approval
- The approval action is semantically different from admin user creation
- However, reuse the same `PasswordEncoder` bean and `UserRepository.save()` pattern

## Patterns to Follow

### Pattern 1: Event-Driven Notifications (Existing)
**What:** Publish domain events, listen asynchronously after transaction commit.
**Existing example:** `ApprovalNotificationEvent` published in approval service, consumed by `EmailService`.
**Apply to:** Registration events follow identical pattern.

### Pattern 2: Admin Controller Under `/api/v1/admin/` (Existing)
**What:** All admin endpoints grouped under `/api/v1/admin/`, secured by path-level Spring Security config.
**Existing example:** `UserManagementController` at `/api/v1/admin/users`.
**Apply to:** `RegistrationAdminController` at `/api/v1/admin/registrations`. Add `@PreAuthorize("hasRole('SUPER_ADMIN')")` for SUPER_ADMIN-only restriction.

### Pattern 3: BusinessException for Validation Errors (Existing)
**What:** Throw `BusinessException(code, message)` for business rule violations.
**Existing example:** `"ORG_DUPLICATE_EMAIL"` in `UserManagementService`.
**Apply to:** New error codes: `REG_DUPLICATE_EMAIL`, `REG_ALREADY_PENDING`, `REG_NOT_FOUND`, `REG_ALREADY_PROCESSED`.

### Pattern 4: Audit Logging (Existing)
**What:** Write to `audit_log` table for significant actions.
**Existing example:** `ACCOUNT_LOCKED` in `AuthService`.
**Apply to:** `REGISTRATION_SUBMITTED`, `REGISTRATION_APPROVED`, `REGISTRATION_REJECTED`. For unauthenticated submission, `user_id` in audit_log is NULL (schema allows this).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding "PENDING" Status to User Table
**What:** Adding `PENDING` to `UserStatus` enum for registration applicants.
**Why bad:** Every query touching users (org tree, approval line picker, user list, document drafter) would need to filter out PENDING users. The `user` table has NOT NULL constraints (`employee_no`, `department_id`) that PENDING users cannot satisfy.
**Instead:** Separate `registration_request` table with its own lifecycle.

### Anti-Pattern 2: Reusing `CreateUserRequest` DTO for Registration
**What:** Exposing the admin user creation DTO to unauthenticated users.
**Why bad:** `CreateUserRequest` requires `employeeNo`, `departmentId`, `role` -- fields applicants should never control.
**Instead:** New `RegistrationSubmitRequest` DTO with only `name`, `email`, `password`.

### Anti-Pattern 3: Synchronous Email in Registration Flow
**What:** Sending emails directly in the request handler.
**Why bad:** SMTP failures would cause the registration request to fail or timeout.
**Instead:** Follow existing async event pattern.

## Frontend Integration Points

### New Public Route

Add to `App.tsx` alongside `/login`:
```tsx
<Route path="/register" element={<RegisterPage />} />
```

### Login Page Modification

Add a "계정 신청" (Register) link on `LoginPage` that navigates to `/register`. Use the same `AuthLayout` wrapper for visual consistency.

### New Admin Page

```
/admin/registrations -> RegistrationListPage (SUPER_ADMIN)
```

Add to the admin routes section in `App.tsx`. Add navigation link in admin sidebar.

### Frontend File Structure

```
frontend/src/features/auth/
  pages/
    RegisterPage.tsx          (NEW)
  components/
    RegisterForm.tsx          (NEW)
  schemas/
    registerSchema.ts         (NEW - Zod validation)
  hooks/
    useRegister.ts            (NEW - TanStack Query mutation)

frontend/src/features/admin/
  pages/
    RegistrationListPage.tsx  (NEW)
  components/
    RegistrationTable.tsx     (NEW)
    RegistrationActions.tsx   (NEW - approve/reject buttons)
  hooks/
    useRegistrations.ts       (NEW - TanStack Query for list + mutations)
```

## Suggested Build Order

Based on dependency analysis:

### Phase 1: Backend Foundation (no frontend dependency)
1. Flyway migration V14 -- create `registration_request` table + seed "미배정" department
2. `RegistrationRequest` entity + `RegistrationRequestRepository`
3. `RegistrationService` -- submit, approve, reject logic
4. `RegistrationController` (public) + `RegistrationAdminController` (admin)
5. `SecurityConfig` modification -- add `/api/v1/registration` to permitAll

### Phase 2: Email Notifications (depends on Phase 1)
6. `RegistrationNotificationEvent` POJO
7. Email templates (Thymeleaf HTML files)
8. `EmailService` listener method for registration events
9. Wire event publishing into `RegistrationService`

### Phase 3: Frontend (depends on Phase 1 API being available)
10. `RegisterPage` + `RegisterForm` -- public registration form
11. Login page "계정 신청" link modification
12. `RegistrationListPage` -- admin view with approve/reject
13. Admin sidebar navigation addition
14. `App.tsx` route additions

### Phase 4: Polish & Edge Cases
15. Rate limiting on `/api/v1/registration` (prevent spam)
16. Duplicate email detection UX (check email availability before submit)
17. Audit log entries for all registration actions

**Rationale:** Backend first because the frontend depends on API contracts. Email second because it is decoupled (async events). Frontend third because it consumes the API. Rate limiting last because it is security hardening, not core functionality.

## Sources

- Existing codebase: SecurityConfig.java, AuthService.java, UserManagementService.java, EmailService.java, User.java, V1__create_schema.sql
- All patterns verified from direct code inspection -- HIGH confidence
