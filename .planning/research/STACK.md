# Stack Research: Self-Registration Feature

**Domain:** User self-registration for internal electronic approval system
**Researched:** 2026-04-07
**Confidence:** HIGH

## Executive Assessment

The self-registration feature requires **minimal new dependencies**. The existing stack (Spring Boot 3.5.13, React 18, MariaDB) handles 90% of the work. The only meaningful additions are: (1) actual SMTP email sending capability (currently stubbed), (2) rate limiting for the public registration endpoint, and (3) Thymeleaf for email templates. No new frontend libraries are needed.

**Critical finding:** Despite PROJECT.md claiming "SMTP email shipped in Phase 9," the EmailService is still a log-only stub. `spring-boot-starter-mail` is NOT in build.gradle.kts. This milestone must implement actual SMTP.

## New Dependencies Required

### Backend — Must Add

| Technology | Version | Purpose | Why Required |
|------------|---------|---------|--------------|
| `spring-boot-starter-mail` | managed by BOM | SMTP email sending | Registration approval/rejection notifications require actual email delivery. Currently only a stub exists. Version managed by Spring Boot 3.5.x dependency management. |
| `spring-boot-starter-thymeleaf` | managed by BOM | Email HTML templates | Registration confirmation, approval, and rejection emails need professional HTML templates. Thymeleaf is the Spring-standard template engine; one template file already exists (`budget-failure-notification.html`) suggesting this was the intended approach. |
| `bucket4j_jdk17-core` | 8.17.0 | Rate limiting for registration endpoint | The `/api/v1/registration` endpoint will be public (unauthenticated). Without rate limiting, it is vulnerable to abuse (spam registrations, email bombing). Bucket4j is the Java standard for token-bucket rate limiting -- lightweight, in-memory, no Redis needed for single-instance deployment. |

### Backend — No New Dependency Needed (Use Existing)

| Capability | Existing Solution | Notes |
|------------|-------------------|-------|
| Registration request storage | JPA/Hibernate (existing) | New `registration_request` entity + Flyway migration. No new library. |
| Password hashing | BCryptPasswordEncoder (existing in SecurityConfig) | Reuse for hashing registration passwords before storage. |
| Input validation | `spring-boot-starter-validation` (existing) | `@Valid`, `@Email`, `@Size` annotations on registration DTO. |
| Async email sending | `@Async` + `@TransactionalEventListener` (existing pattern) | EmailService already uses this pattern. Extend for registration events. |
| Retry on email failure | `spring-retry` (existing in build.gradle.kts) | Already available. Apply `@Retryable` to actual email sending method. |
| API documentation | SpringDoc OpenAPI (existing) | Registration endpoints auto-documented. |
| DTO mapping | MapStruct (existing) | Map RegistrationRequest entity to/from DTOs. |

### Frontend — No New Dependencies Needed

| Capability | Existing Solution | Notes |
|------------|-------------------|-------|
| Registration form | React Hook Form + Zod (existing) | Name, email, password fields with validation. |
| API calls | Axios + TanStack Query (existing) | `useMutation` for registration submit. |
| Admin management UI | TanStack Query + Headless UI (existing) | List/approve/reject registration requests. |
| Routing | React Router 7 (existing) | Add `/register` public route. |
| State management | Zustand (existing) | Minimal state needed; mostly server state via TanStack Query. |
| UI components | TailwindCSS + Lucide React (existing) | Consistent with existing UI. |

## Installation

```kotlin
// Add to backend/build.gradle.kts dependencies block:

// SMTP email sending
implementation("org.springframework.boot:spring-boot-starter-mail")

// Email HTML templates
implementation("org.springframework.boot:spring-boot-starter-thymeleaf")

// Rate limiting for public registration endpoint
implementation("com.bucket4j:bucket4j_jdk17-core:8.17.0")
```

```yaml
# Add to application.yml (or application-prod.yml):
spring:
  mail:
    host: ${MAIL_HOST:smtp.gmail.com}
    port: ${MAIL_PORT:587}
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
    protocol: smtp
```

No frontend `npm install` needed.

## Alternatives Considered

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| Bucket4j (in-memory) | bucket4j-spring-boot-starter | The starter (0.14.0-RC1) adds YAML config magic but is overkill for one endpoint. Direct Bucket4j usage in a simple servlet filter is clearer and has no RC-version risk. |
| Bucket4j (in-memory) | Resilience4j RateLimiter | Resilience4j is a circuit-breaker library that happens to have rate limiting. Bucket4j is purpose-built for rate limiting with better token-bucket semantics. |
| Bucket4j (in-memory) | Spring Cloud Gateway rate limiter | Requires Spring Cloud Gateway as a separate service. Overkill for a monolithic app with ~50 users. |
| Thymeleaf templates | Plain string concatenation | Email body is HTML with dynamic variables (user name, request status, login link). Thymeleaf prevents XSS in emails and is maintainable. String concatenation for HTML is fragile and error-prone. |
| Simple rate limit filter | Google reCAPTCHA | CAPTCHA adds external dependency (Google), requires internet access from client, and degrades UX. For an internal app with ~50 employees, IP-based rate limiting is sufficient. |
| Honeypot field (frontend) | CAPTCHA | A hidden form field that bots fill but humans don't. Zero UX cost, no external dependency. Combine with rate limiting for defense in depth. |
| No email verification | Email verification flow | For an internal ~50 person company with SUPER_ADMIN manual approval, email verification adds unnecessary friction. The admin approval IS the verification step. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Google reCAPTCHA / hCaptcha | External dependency, UX friction, overkill for internal app with admin approval gate | Rate limiting (Bucket4j) + honeypot field |
| Email verification token flow | Admin manually approves each registration. Double verification (email + admin) is redundant for 50 employees. | SUPER_ADMIN approval as the single gate |
| Separate registration microservice | Over-engineering for a monolith serving 50 users | New JPA entity + controller in existing backend |
| Redis for rate limit storage | Single-instance deployment, no distributed rate limiting needed | Bucket4j in-memory (default) |
| Spring Security registration flow | Spring Security's built-in user registration is designed for self-service apps. MiceSign needs admin-gated registration, which is custom business logic. | Custom RegistrationService with manual approval workflow |
| bucket4j-spring-boot-starter 0.14.0-RC1 | RC (release candidate) version. Not stable for production. | Direct `bucket4j_jdk17-core` 8.17.0 (stable release) |

## Integration Points

### SecurityConfig Changes

The registration endpoint must be added to `permitAll()` in SecurityConfig:

```java
.requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
.requestMatchers("/api/v1/registration").permitAll()  // NEW: public registration
```

### EmailService Upgrade Path

The existing `EmailService` stub must be upgraded to use `JavaMailSender`. The existing patterns to preserve:
- `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` -- send after transaction commits
- `@Async` -- non-blocking email sending
- `NotificationLog` entity -- keep logging all email attempts
- `@Retryable` -- add to actual send method for transient SMTP failures

New event types to add: `REGISTRATION_SUBMITTED`, `REGISTRATION_APPROVED`, `REGISTRATION_REJECTED`.

### Rate Limiting Strategy

Apply to registration endpoint only (not login -- login already has account lockout):
- **Limit:** 5 requests per IP per hour
- **Implementation:** Servlet filter with `ConcurrentHashMap<String, Bucket>` keyed by IP
- **Cleanup:** Scheduled task to evict expired buckets (prevent memory leak)

### Database Migration

New Flyway migration for `registration_request` table. No schema changes to existing tables.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `spring-boot-starter-mail` (BOM-managed) | Spring Boot 3.5.13 | Auto-managed by `io.spring.dependency-management` plugin. Uses Jakarta Mail 2.1.x. |
| `spring-boot-starter-thymeleaf` (BOM-managed) | Spring Boot 3.5.13 | Auto-managed. Uses Thymeleaf 3.1.x. Compatible with existing template at `templates/email/`. |
| `bucket4j_jdk17-core` 8.17.0 | Java 17+ | Standalone library, no Spring dependency. Released 2025-12-28. |
| Existing `spring-retry` | `@Retryable` on email sending | Already in build.gradle.kts with `spring-boot-starter-aop`. Ready to use. |

## Sources

- [Bucket4j official documentation (v8.17.0)](https://bucket4j.com/) -- rate limiting API, token-bucket algorithm, HIGH confidence
- [Bucket4j GitHub](https://github.com/bucket4j/bucket4j) -- version history, Java 17 support, HIGH confidence
- [bucket4j-spring-boot-starter GitHub](https://github.com/MarcGiffing/bucket4j-spring-boot-starter) -- evaluated and rejected (RC version), HIGH confidence
- [Baeldung: Rate Limiting with Bucket4j](https://www.baeldung.com/spring-bucket4j) -- Spring Boot integration patterns, MEDIUM confidence
- [Baeldung: Spring Security Registration CAPTCHA](https://www.baeldung.com/spring-security-registration-captcha) -- evaluated reCAPTCHA, decided against for internal app, MEDIUM confidence
- Codebase analysis: `backend/build.gradle.kts`, `SecurityConfig.java`, `EmailService.java` -- current state verification, HIGH confidence

---
*Stack research for: MiceSign v1.3 Self-Registration*
*Researched: 2026-04-07*
