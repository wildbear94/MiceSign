# Feature Landscape: Self-Registration (사용자 등록 신청)

**Domain:** Corporate internal system self-registration with admin approval
**Researched:** 2026-04-07
**Scope:** NEW features only for v1.3 milestone (self-registration). Existing system features are already shipped.

## Table Stakes

Features users expect. Missing = feature feels incomplete or unusable.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|-------------|
| Registration form on login page | Users need a visible way to request an account without contacting admin | Low | LoginPage.tsx — add link; new RegistrationPage |
| Minimal input: name, email, password | PROJECT.md specifies these 3 fields; matches milestone scope | Low | None new — reuses existing validation patterns |
| Password confirmation field | Standard UX for any registration form; prevents typo lockout | Low | Frontend only |
| Email uniqueness check (real-time) | Prevents frustrating submit-then-fail; email is unique in `user` table | Low | New public API endpoint: `GET /api/registration/check-email` |
| Submission success feedback | User must know their request was received and is pending | Low | Frontend toast or success page |
| SUPER_ADMIN approval/rejection UI | Core requirement — admin must be able to act on requests | Med | New admin page in existing admin sidebar layout |
| Request list with status filter | Admin needs to see pending/approved/rejected requests | Low | Pagination reuses existing patterns (UserManagementService) |
| Rejection reason field | Admin should explain why a request was denied; user sees it in email | Low | Single text field on rejection modal |
| Email notification on submission (to SUPER_ADMIN) | Admin must know there is a pending request to review | Low | Reuses existing EmailService infrastructure |
| Email notification on approval (to applicant) | Applicant must know they can now log in | Low | Reuses existing EmailService |
| Email notification on rejection (to applicant) | Applicant must know they were denied and why | Low | Reuses existing EmailService |
| Duplicate request prevention | Same email should not have multiple PENDING requests | Low | Service-level check + DB unique constraint on (email, status=PENDING) |

## Differentiators

Features that improve quality but are not strictly required for the feature to function.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Password strength indicator | Visual feedback during registration helps users pick strong passwords | Low | Frontend-only; reuses existing password rules from PasswordService |
| Request status check page | Applicant can return to check request status without contacting admin | Med | Needs token-based lookup or email lookup; adds public endpoint complexity |
| Auto-generated employee number on approval | Reduces admin manual work when approving | Low | Sequential `EMP-YYYY-NNNN` generation; easy to implement |
| Admin can set department/position during approval | One-step approval instead of approve-then-edit | Med | Adds org tree selector to approval modal; reduces admin steps from 2 to 1 |

## Anti-Features

Features to explicitly NOT build for this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Email verification (confirmation link) | Overkill for internal company system; admin approval is the gate | Admin approval serves as the verification step |
| CAPTCHA on registration form | Internal network; ~50 employees; no public internet attack surface | Rate limiting on the endpoint is sufficient |
| Self-service department/position selection | Applicant does not know their org placement; admin assigns post-approval | Admin sets department/position via existing user edit page after approval |
| Social login / SSO for registration | Out of scope; no SSO infrastructure exists | Keep simple email+password |
| Registration invitation codes | Adds friction without benefit for small company | Open registration + admin approval is simpler |
| Applicant can edit pending request | Complexity not worth it; withdraw and resubmit is cleaner | Allow withdrawal of pending request if needed |
| Auto-approval rules | Contradicts manual-approval philosophy of the entire system | Keep SUPER_ADMIN manual approval only |
| Bulk approval/rejection | Unnecessary for ~50 person company; requests come in one at a time | Single approval/rejection workflow |

## Critical Design Constraint: Database Schema

**This is the most important finding.** The existing `user` table has hard constraints:
- `employee_no VARCHAR(20) NOT NULL UNIQUE` — applicant does not know their employee number
- `department_id BIGINT NOT NULL` — applicant does not select a department

Self-registration CANNOT write directly to the `user` table.

**Recommended solution: Separate `registration_request` table.**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **New `registration_request` table** | Clean separation; zero schema changes to `user`; no ripple effects | New entity + migration | **Use this** |
| Add PENDING status to user + nullable columns | Fewer tables | Breaks NOT NULL constraints; forces changes to every user query; risky | Reject |
| Sentinel values in user table | No schema changes | Dirty data everywhere; fragile | Reject |

### `registration_request` table design

```sql
CREATE TABLE registration_request (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(50)  NOT NULL,
    email         VARCHAR(150) NOT NULL,
    password      VARCHAR(255) NOT NULL,  -- bcrypt hashed
    status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
    reject_reason VARCHAR(500) NULL,
    reviewed_by   BIGINT       NULL,  -- FK to user.id (SUPER_ADMIN who reviewed)
    reviewed_at   DATETIME     NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_email_pending (email, status)  -- or handled in service layer
);
```

## Feature Dependencies

```
Registration Form (public, no auth)
  --> RegistrationRequest entity + table (Flyway migration)
  --> Email uniqueness check (checks both user.email AND registration_request.email where PENDING)
  --> Email notification to SUPER_ADMIN(s) on submit

Admin Approval UI (SUPER_ADMIN only)
  --> Registration request list/detail endpoints
  --> Approve action:
      --> Create User (reuse pattern from UserManagementService.createUser)
      --> Auto-generate employee_no OR admin enters it
      --> Set default department (admin reassigns later) OR admin picks during approval
      --> Set role=USER, status=ACTIVE, mustChangePassword=true
      --> Email notification to applicant (approved)
  --> Reject action:
      --> Update request status + reject_reason
      --> Email notification to applicant (rejected)

Email Notifications
  --> Existing EmailService.sendEmail() method
  --> New NotificationEventType values: REGISTRATION_SUBMIT, REGISTRATION_APPROVE, REGISTRATION_REJECT
  --> New email templates (subject + body patterns)
```

**Dependency on existing infrastructure:**
- `EmailService` (Phase 9) — reuse `sendEmail()` for all 3 notification types
- `SecurityConfig` — must whitelist `/api/registration/**` as public endpoints
- `UserManagementService.createUser` pattern — reuse for user creation on approval
- Admin sidebar/layout — add registration management menu item
- `LoginPage.tsx` — add "계정 신청" link

## MVP Recommendation

**Must build (all table stakes):**

1. **Flyway migration** for `registration_request` table
2. **RegistrationRequest** entity, repository, service, controller
3. **Public API endpoints** (no auth required):
   - `POST /api/registration` — submit registration request
   - `GET /api/registration/check-email?email=...` — check email availability
4. **Admin API endpoints** (SUPER_ADMIN only):
   - `GET /api/admin/registration-requests` — list with status filter + pagination
   - `GET /api/admin/registration-requests/{id}` — detail
   - `POST /api/admin/registration-requests/{id}/approve` — approve and create user
   - `POST /api/admin/registration-requests/{id}/reject` — reject with reason
5. **Registration form page** linked from login page ("계정 신청" link)
6. **Admin registration management page** in admin section sidebar
7. **Three email notifications** via existing EmailService:
   - To SUPER_ADMIN on new request
   - To applicant on approval (include login instructions)
   - To applicant on rejection (include reason)

**Defer (not needed for MVP):**
- Request status check page — applicant gets email notification, no need to poll
- Auto-generated employee number — admin can enter manually or set later
- Department/position selection during approval — admin uses existing user edit page

## Phasing Suggestion

| Phase | Scope | Rationale |
|-------|-------|-----------|
| 1 | DB migration + backend entity/service/controller | Foundation; can test with API calls |
| 2 | Frontend registration form + login page link | User-facing; depends on backend APIs |
| 3 | Frontend admin management page + approve/reject | Admin-facing; depends on backend APIs |
| 4 | Email notifications + polish | Wiring up events; end-to-end testing |

## Complexity Assessment

| Component | Estimated Effort | Risk |
|-----------|-----------------|------|
| DB migration | 30 min | Low — straightforward new table |
| Backend entity/repository/service | 2-3 hours | Low — follows existing patterns exactly |
| Backend controller + security config | 1-2 hours | Low — public endpoints + SUPER_ADMIN endpoints |
| Frontend registration form | 2-3 hours | Low — simple form with 3-4 fields |
| Frontend admin management page | 3-4 hours | Med — list + approve/reject modals |
| Email notifications | 1-2 hours | Low — reuses existing EmailService |
| **Total** | **~10-15 hours** | **Low overall** |

## Sources

- Existing codebase: `User.java` (entity with NOT NULL constraints), `UserManagementService.java` (createUser pattern), `EmailService.java` (notification infrastructure), `LoginPage.tsx` (entry point for registration link), `V1__create_schema.sql` (schema constraints)
- `PROJECT.md` milestone v1.3 requirements
- Domain knowledge: Korean corporate system registration patterns — admin-gated registration is standard for internal tools
