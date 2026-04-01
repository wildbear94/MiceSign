# Phase 2: Authentication - Research

**Researched:** 2026-04-01
**Domain:** JWT authentication, Spring Security, React auth flow, i18n
**Confidence:** HIGH

## Summary

Phase 2 replaces the Phase 1 permit-all SecurityConfig with full JWT-based stateless authentication. The backend needs a JWT filter chain with jjwt 0.12.6, refresh token rotation stored in the existing `refresh_token` table, account lockout tracking via new user table columns, and password management endpoints. The frontend needs a login page, Zustand auth store, Axios JWT interceptor with queue pattern, react-i18next infrastructure, protected route guards, and a password change page.

The existing codebase provides strong foundations: SecurityConfig with BCryptPasswordEncoder, Axios client with placeholder interceptor, empty `features/auth/` directory, `refresh_token` table in the schema, and the ApiResponse envelope pattern. Key gaps that need addressing: missing `failed_login_count`/`locked_until`/`must_change_password` columns on the user table (new Flyway migration), no JPA entities yet (User, RefreshToken), no JWT dependencies in build.gradle.kts, and no react-i18next or routing setup in the frontend.

**Primary recommendation:** Build backend JWT infrastructure first (entities, JWT util, security filter chain, auth endpoints), then frontend auth flow (Zustand store, Axios interceptor, login page, route guards, i18n), then password management and lockout UI features.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Centered card layout on minimal background with MiceSign logo + app name at top
- **D-02:** "Remember me" checkbox -- unchecked = session cookie (browser close = logout), checked = 14-day refresh token. Label: "로그인 상태 유지"
- **D-03:** Bilingual UI (Korean/English) using react-i18next with browser locale auto-detect. Korean default. Entire app scope i18n infrastructure
- **D-04:** Inline validation errors below each field, auth errors as banner above form. Validation triggers on blur + on submit
- **D-05:** Email field auto-focus on page load, Enter key submits from any field
- **D-06:** Password visibility toggle (eye icon)
- **D-07:** Login button disables with spinner during API call
- **D-08:** System dark/light theme preference (follows OS setting, no manual toggle on login page)
- **D-09:** After successful login, redirect to dashboard page
- **D-10:** Inline below fields for validation, banner above form for auth errors
- **D-11:** Axios interceptor uses queue pattern for concurrent 401s
- **D-12:** Proactive token refresh when <5 minutes remaining (30min access token TTL)
- **D-13:** Access token stored in Zustand in-memory only
- **D-14:** On app init, call /api/v1/auth/refresh silently with splash spinner
- **D-15:** Refresh endpoint returns user profile data alongside new access token
- **D-16:** On refresh failure, silently clear auth state and redirect to /login
- **D-17:** Refresh tokens stored in database (refresh_token table)
- **D-18:** Immediate invalidation on token rotation
- **D-19:** JWT library: jjwt 0.12.x
- **D-20:** JWT signing: HMAC-SHA256 (symmetric key)
- **D-21:** JWT secret configured in application.yml
- **D-22:** JWT claims: sub (userId), email, name, role, departmentId, iat, exp
- **D-23:** Multiple active sessions per user allowed
- **D-24:** Logout invalidates current session's refresh token only
- **D-25:** HTTP 401 for missing/expired token, 403 for insufficient role
- **D-26:** Password change on dedicated profile/settings page
- **D-27:** Password rules: min 8 chars, at least 2 of: uppercase, lowercase, number, special char
- **D-28:** Real-time password strength bar + checklist
- **D-29:** Admin password reset: admin enters temporary password, user must change on next login
- **D-30:** Force password change on first login AND after admin reset
- **D-31:** Password change form: current + new + confirm
- **D-32:** After password change, invalidate all other sessions except current
- **D-33:** No password history check
- **D-34:** No self-service forgot password -- admin reset only
- **D-35:** Success message "비밀번호가 변경되었습니다" then redirect to dashboard
- **D-36:** Lockout message with live countdown: "계정이 잠겼습니다. MM:SS 후 다시 시도해주세요."
- **D-37:** Show remaining login attempts after each failure
- **D-38:** Admin can manually unlock a locked account
- **D-39:** Failed attempt counter resets on successful login and after lockout expires
- **D-40:** Login button disabled with live countdown timer during lockout
- **D-41:** Lockout events logged to audit_log table
- **D-42:** Lockout tracked per-account only (not per-IP)
- **D-43:** failed_login_count and locked_until stored in user table
- **D-44:** Distinct visual treatment for wrong credentials vs locked account

### Claude's Discretion
- Exact Tailwind styling and color palette for login card
- Splash/loading spinner component design
- i18n namespace organization and file structure
- Exact JWT token expiry buffer calculation logic
- Axios interceptor internal implementation details
- Zustand auth store structure
- Profile/settings page layout details
- React Router route guard implementation approach
- Backend security filter chain ordering

### Deferred Ideas (OUT OF SCOPE)
- Self-service "forgot password" via email link (Phase 1-B, needs SMTP)
- "Logout all devices" button in user settings (Phase 3+)
- Login attempt rate limiting by IP
- OAuth/SSO integration
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in with email and password, receiving JWT access + refresh tokens | jjwt 0.12.6 JWT generation, Spring Security filter chain, login endpoint per FSD FN-AUTH-001 |
| AUTH-02 | Access token refreshes automatically via refresh token rotation (HttpOnly cookie) | Axios queue interceptor pattern, refresh endpoint per FSD FN-AUTH-002, token rotation with DB tracking |
| AUTH-03 | User can log out, invalidating refresh token | Logout endpoint per FSD FN-AUTH-003, cookie clearing, Zustand state reset |
| AUTH-04 | Account locks after 5 consecutive failed login attempts for 15 minutes | New DB columns (failed_login_count, locked_until) via Flyway V3, lockout logic in AuthService |
| AUTH-05 | User session persists across browser refresh (auto-refresh on app init) | Silent refresh on app init (D-14), splash screen while checking auth |
| AUTH-06 | User can change their own password | Password change endpoint per FSD FN-AUTH-004, password strength validation (D-27/D-28) |
| AUTH-07 | Admin can reset a user's password | Admin reset endpoint per FSD FN-AUTH-005, force password change flag (D-29/D-30) |
</phase_requirements>

## Standard Stack

### Core (Backend -- New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jjwt-api | 0.12.6 | JWT creation/parsing API | Locked decision D-19; de facto Java JWT library |
| jjwt-impl | 0.12.6 | JWT implementation (runtime) | Required runtime dependency for jjwt |
| jjwt-jackson | 0.12.6 | JWT JSON serialization (runtime) | Jackson integration for JWT claims |

### Core (Frontend -- New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-i18next | 17.0.2 | React i18n bindings | Locked decision D-03; standard React i18n solution |
| i18next | 26.0.3 | i18n core framework | Required by react-i18next |
| i18next-browser-languagedetector | latest | Auto-detect browser locale | D-03 requires browser locale auto-detect |
| i18next-http-backend | latest | Load translation files lazily | Standard pattern for JSON translation files |
| @hookform/resolvers | 5.2.2 | Connect Zod to React Hook Form | Already in project deps; needed for form validation |
| lucide-react | latest | Icon library | Eye icon for password toggle (D-06), error/success icons |

### Already Present (No Changes Needed)

| Library | Version | Purpose |
|---------|---------|---------|
| spring-boot-starter-security | (managed) | Security framework -- already in build.gradle.kts |
| spring-security-test | (managed) | Test utilities -- already in build.gradle.kts |
| BCryptPasswordEncoder | (built-in) | Password hashing -- already configured in SecurityConfig |
| axios | ^1.14.0 | HTTP client -- already in frontend package.json |
| zustand | ^5.0.12 | State management -- already in frontend package.json |
| react-hook-form | ^7.72.0 | Form management -- already in frontend package.json |
| zod | ^4.3.6 | Schema validation -- already in frontend package.json |
| react-router | ^7.13.2 | Client-side routing -- already in frontend package.json |
| @tanstack/react-query | ^5.95.2 | Server state -- already in frontend package.json |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jjwt | Nimbus JOSE+JWT | jjwt is simpler for symmetric HMAC; Nimbus better for JWK/OIDC -- but D-19 locks jjwt |
| lucide-react | heroicons | Either works; lucide-react has smaller bundle and more icons |

**Installation (Backend -- add to build.gradle.kts):**
```kotlin
// JWT
implementation("io.jsonwebtoken:jjwt-api:0.12.6")
runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
```

**Installation (Frontend):**
```bash
npm install react-i18next i18next i18next-browser-languagedetector i18next-http-backend lucide-react
npm install -D @types/i18next
```

## Architecture Patterns

### Backend Package Structure (Auth additions)
```
com.micesign/
├── config/
│   └── SecurityConfig.java          # REPLACE permit-all with JWT filter chain
├── security/
│   ├── JwtTokenProvider.java        # JWT generation, parsing, validation
│   ├── JwtAuthenticationFilter.java # OncePerRequestFilter -- extract & validate JWT
│   └── CustomUserDetails.java       # UserDetails implementation from JWT claims
├── controller/
│   └── AuthController.java          # /api/v1/auth/* endpoints
├── service/
│   ├── AuthService.java             # Login, refresh, logout orchestration
│   └── PasswordService.java         # Password change, admin reset, validation
├── domain/
│   ├── User.java                    # JPA entity (add lockout + force-change fields)
│   └── RefreshToken.java            # JPA entity for refresh_token table
├── repository/
│   ├── UserRepository.java          # findByEmail, lockout queries
│   └── RefreshTokenRepository.java  # CRUD + deleteByUserId, deleteExpired
└── dto/
    ├── LoginRequest.java            # email, password
    ├── LoginResponse.java           # accessToken, user profile
    ├── PasswordChangeRequest.java   # currentPassword, newPassword, confirmPassword
    └── AdminPasswordResetRequest.java # newPassword (entered by admin)
```

### Frontend Structure (Auth additions)
```
src/
├── features/auth/
│   ├── pages/
│   │   ├── LoginPage.tsx            # Login form with i18n
│   │   └── ChangePasswordPage.tsx   # Password change form
│   ├── components/
│   │   ├── LoginForm.tsx            # Form with validation, remember me, lockout UI
│   │   ├── PasswordStrengthBar.tsx  # Real-time strength indicator
│   │   └── AuthErrorBanner.tsx      # Banner for auth errors (wrong creds, lockout)
│   ├── hooks/
│   │   ├── useAuth.ts              # Auth actions (login, logout, refresh)
│   │   └── usePasswordChange.ts    # Password change mutation
│   └── schemas/
│       ├── loginSchema.ts          # Zod validation for login form
│       └── passwordSchema.ts       # Zod validation for password change
├── stores/
│   └── authStore.ts                # Zustand: accessToken, user, isAuthenticated, isLoading
├── api/
│   └── client.ts                   # ADD JWT request interceptor + 401 queue interceptor
├── components/
│   ├── ProtectedRoute.tsx          # Route guard checking auth state
│   ├── ForcePasswordChangeGuard.tsx # Redirect to change-password if mustChangePassword
│   └── SplashScreen.tsx            # Loading spinner during auth check
├── i18n/
│   ├── config.ts                   # i18next initialization
│   └── locales/
│       ├── ko/
│       │   ├── common.json         # Shared translations
│       │   └── auth.json           # Auth-specific translations
│       └── en/
│           ├── common.json
│           └── auth.json
└── layouts/
    └── AuthLayout.tsx              # Centered card layout for login/password pages
```

### Pattern 1: JWT Authentication Filter Chain

**What:** Spring Security filter that extracts JWT from Authorization header, validates it, and sets SecurityContext.

**When to use:** Every authenticated request.

```java
// JwtAuthenticationFilter.java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String token = resolveToken(request);
        if (token != null && jwtTokenProvider.validateToken(token)) {
            Authentication auth = jwtTokenProvider.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/v1/auth/login")
            || path.startsWith("/api/v1/auth/refresh")
            || path.startsWith("/v3/api-docs")
            || path.startsWith("/swagger-ui");
    }
}
```

### Pattern 2: SecurityConfig with JWT

**What:** Replace permit-all with proper JWT security filter chain.

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // enables @PreAuthorize
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                            JwtAuthenticationFilter jwtFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/api/v1/admin/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, authEx) -> {
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"success\":false,\"data\":null,\"error\":{\"code\":\"AUTH_TOKEN_EXPIRED\",\"message\":\"인증이 필요합니다.\"}}");
                })
                .accessDeniedHandler((req, res, accessEx) -> {
                    res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"success\":false,\"data\":null,\"error\":{\"code\":\"AUTH_FORBIDDEN\",\"message\":\"접근 권한이 없습니다.\"}}");
                })
            );
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### Pattern 3: Axios Interceptor with Queue Pattern

**What:** Request interceptor adds Bearer token; response interceptor handles 401 with queue to prevent multiple simultaneous refresh calls.

```typescript
// Conceptual pattern for client.ts
let isRefreshing = false;
let failedQueue: Array<{resolve: Function; reject: Function}> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Request interceptor -- attach token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    // Proactive refresh check (D-12)
    if (isTokenExpiringSoon(token, 5 * 60)) {
      // trigger background refresh
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor -- handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await apiClient.post('/auth/refresh');
        useAuthStore.getState().setAuth(data.data.accessToken, data.data.user);
        processQueue(null, data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

### Pattern 4: Zustand Auth Store

**What:** In-memory auth state. Access token never persisted to localStorage.

```typescript
interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean; // true during initial auth check
  setAuth: (token: string, user: UserProfile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}
```

### Pattern 5: Protected Route Guard

**What:** React Router wrapper that checks auth state, redirects to /login if not authenticated, and checks mustChangePassword flag.

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) return <SplashScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) return <Navigate to="/change-password" replace />;

  return <>{children}</>;
}
```

### Anti-Patterns to Avoid
- **Storing JWT in localStorage/sessionStorage:** Vulnerable to XSS. Use Zustand in-memory only (D-13).
- **Storing raw refresh token in DB:** Always hash with SHA-256 before storing (matches existing schema `token_hash`).
- **Using Spring Security's UserDetailsService for stateless JWT:** Not needed; parse claims from JWT directly. Only load from DB on login and refresh.
- **Making separate /me call after refresh:** D-15 says refresh endpoint returns user profile data alongside token.
- **Blocking requests during proactive refresh:** Proactive refresh (D-12) should be non-blocking; only the queue pattern for 401s should block/queue.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT creation/parsing | Custom JWT string builder | jjwt 0.12.6 | Signing, claim validation, expiry checks -- all handled correctly |
| Password hashing | Custom hash | BCryptPasswordEncoder (already configured) | Salt management, timing attack resistance |
| i18n pluralization/interpolation | Custom string replacement | react-i18next + i18next | Plurals, context, interpolation, namespace loading |
| Form validation | Manual field checking | React Hook Form + Zod | Handles blur/submit triggers, error state, focus management |
| Browser locale detection | navigator.language parsing | i18next-browser-languagedetector | Handles fallback chain, localStorage persistence |
| Password strength estimation | Regex counting | Algorithmic check based on D-27 rules (2 of 4 categories) | Simple enough for custom code but validate with Zod schema |

## Common Pitfalls

### Pitfall 1: Refresh Token Rotation Race Condition
**What goes wrong:** Two concurrent requests both get 401, both try to refresh. The second refresh uses an already-rotated token, which triggers "token reuse detected" and invalidates ALL user tokens.
**Why it happens:** Without queue pattern, parallel requests independently attempt refresh.
**How to avoid:** Axios interceptor queue pattern (D-11) -- first 401 triggers refresh, subsequent 401s queue and wait for the same refresh to complete.
**Warning signs:** Users randomly get logged out when navigating quickly between pages.

### Pitfall 2: Remember Me Cookie Lifetime
**What goes wrong:** "Remember me" unchecked should use a session cookie that expires on browser close, but cookie gets a fixed maxAge.
**How to avoid:** When "Remember me" is unchecked, set the refresh token cookie WITHOUT maxAge (session cookie). When checked, set maxAge to 14 days. Backend must know which mode to use -- include `rememberMe: boolean` in login request.
**Warning signs:** Users who don't check "remember me" still stay logged in after closing browser.

### Pitfall 3: H2 Test Compatibility with New Migration
**What goes wrong:** V3 migration adding columns to user table uses MariaDB-specific syntax that fails on H2.
**Why it happens:** H2 MariaDB mode doesn't support all MariaDB syntax.
**How to avoid:** Maintain parallel test migration files in `db/testmigration/` with H2-compatible syntax (established pattern from Phase 1).
**Warning signs:** Backend tests fail after adding V3 migration.

### Pitfall 4: JWT Filter Ordering
**What goes wrong:** JWT filter placed in wrong position in the filter chain, causing it to run after authentication checks.
**Why it happens:** Spring Security filter chain ordering is not obvious.
**How to avoid:** Use `addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)` explicitly.
**Warning signs:** All authenticated endpoints return 401 even with valid tokens.

### Pitfall 5: CORS with HttpOnly Cookies
**What goes wrong:** Refresh endpoint doesn't receive the HttpOnly cookie because CORS isn't configured to allow credentials.
**Why it happens:** Axios needs `withCredentials: true`, and server needs `Access-Control-Allow-Credentials: true` with a specific origin (not wildcard).
**How to avoid:** In dev, Vite proxy handles this (same-origin). In production, Nginx serves both frontend and proxies API (same-origin). But for any cross-origin scenario, configure CORS in SecurityConfig with specific allowed origins and `allowCredentials(true)`.
**Warning signs:** Refresh works in dev but fails in production, or vice versa.

### Pitfall 6: Force Password Change Loop
**What goes wrong:** User with `mustChangePassword=true` gets redirected to change-password page, but the change-password API also requires authentication, and the JWT doesn't carry the flag.
**How to avoid:** Include `mustChangePassword` in JWT claims OR in the user profile returned by refresh. The route guard checks this flag. The change-password endpoint must be accessible even when `mustChangePassword=true`.
**Warning signs:** New users can't change their password because the guard blocks access to the change-password page.

### Pitfall 7: Stray position_id Column in refresh_token Table
**What goes wrong:** The V1 migration has a `position_id BIGINT NULL` column in `refresh_token` table that is NOT in the PRD schema. This is likely a copy-paste error from user table.
**Why it happens:** Schema was hand-adapted from PRD DDL.
**How to avoid:** V3 migration should drop this column: `ALTER TABLE refresh_token DROP COLUMN position_id;` and also drop the foreign key constraint.
**Warning signs:** RefreshToken JPA entity has an unexpected column that doesn't map to any business logic.

## Code Examples

### jjwt 0.12.6 Token Generation (HMAC-SHA256)

```java
// Source: jjwt GitHub documentation
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;

// Generate key from secret string (at least 256 bits for HS256)
SecretKey key = Keys.hmacShaKeyFor(secretString.getBytes(StandardCharsets.UTF_8));

// Create token
String token = Jwts.builder()
    .subject(String.valueOf(userId))
    .claim("email", user.getEmail())
    .claim("name", user.getName())
    .claim("role", user.getRole().name())
    .claim("departmentId", user.getDepartmentId())
    .issuedAt(new Date())
    .expiration(new Date(System.currentTimeMillis() + accessTokenTtlMs))
    .signWith(key)
    .compact();

// Parse token
Claims claims = Jwts.parser()
    .verifyWith(key)
    .build()
    .parseSignedClaims(token)
    .getPayload();

String userId = claims.getSubject();
String role = claims.get("role", String.class);
```

### Refresh Token Hash (SHA-256)

```java
import java.security.MessageDigest;
import java.util.Base64;

String hashToken(String rawToken) {
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
    return Base64.getEncoder().encodeToString(hash);
}
```

### Spring Security Cookie Setting

```java
ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
    .httpOnly(true)
    .secure(true) // HTTPS only
    .sameSite("Strict")
    .path("/api/v1/auth/refresh") // scope cookie to refresh endpoint only
    .maxAge(rememberMe ? Duration.ofDays(14) : Duration.ZERO) // 0 = session cookie
    .build();
response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
```

Note: `Duration.ZERO` for `maxAge` does NOT create a session cookie. For a session cookie, omit `maxAge` entirely:
```java
ResponseCookie.Builder builder = ResponseCookie.from("refreshToken", refreshToken)
    .httpOnly(true)
    .secure(true)
    .sameSite("Strict")
    .path("/api/v1/auth/refresh");
if (rememberMe) {
    builder.maxAge(Duration.ofDays(14));
}
// When maxAge is not set, cookie becomes a session cookie
ResponseCookie cookie = builder.build();
```

### i18next Configuration

```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ko',
    supportedLngs: ['ko', 'en'],
    defaultNS: 'common',
    ns: ['common', 'auth'],
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
```

### Flyway V3 Migration (MariaDB)

```sql
-- V3__add_auth_columns.sql
ALTER TABLE `user`
    ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0 COMMENT '연속 로그인 실패 횟수' AFTER profile_image,
    ADD COLUMN locked_until DATETIME NULL COMMENT '계정 잠금 해제 시각' AFTER failed_login_count,
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE COMMENT '비밀번호 변경 필요 여부' AFTER locked_until;

-- Fix: remove stray position_id from refresh_token table
ALTER TABLE refresh_token DROP FOREIGN KEY refresh_token_ibfk_2;
ALTER TABLE refresh_token DROP COLUMN position_id;
```

## Schema Changes Required

### New Columns on `user` Table

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| failed_login_count | INT NOT NULL | 0 | Track consecutive failed logins (D-43) |
| locked_until | DATETIME NULL | NULL | Lockout expiry timestamp (D-43) |
| must_change_password | BOOLEAN NOT NULL | FALSE | Force password change flag (D-30) |

### Fix `refresh_token` Table

The V1 migration has a stray `position_id` column with a foreign key to `position` table. This column does not exist in the PRD schema and has no business purpose. The V3 migration must remove it.

### Existing `refresh_token` Table (Already Created in V1)

| Column | Type | Purpose |
|--------|------|---------|
| id | BIGINT PK | Auto-increment |
| user_id | BIGINT FK | Owner user |
| token_hash | VARCHAR(255) UNIQUE | SHA-256 hash of refresh token |
| device_info | VARCHAR(500) NULL | Browser/device identifier |
| expires_at | DATETIME | Token expiry |
| created_at | DATETIME | Creation timestamp |

## API Endpoints Summary

Per FSD spec, adapted to `/api/v1` prefix convention:

| Method | Path | Auth | Purpose | FSD Ref |
|--------|------|------|---------|---------|
| POST | /api/v1/auth/login | Public | Login, return AT + set RT cookie | FN-AUTH-001 |
| POST | /api/v1/auth/refresh | Cookie | Rotate RT, return new AT + user profile | FN-AUTH-002 |
| POST | /api/v1/auth/logout | Bearer | Invalidate current RT, clear cookie | FN-AUTH-003 |
| PUT | /api/v1/auth/password | Bearer | Change own password | FN-AUTH-004 |
| POST | /api/v1/admin/users/{id}/reset-password | Bearer (ADMIN+) | Admin resets user password | FN-AUTH-005 |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jjwt 0.11.x `signWith(key, algo)` | jjwt 0.12.x `signWith(key)` auto-detects algo | 0.12.0 (2023) | API simplified; `SignatureAlgorithm` enum deprecated |
| jjwt `parseClaimsJws()` | jjwt `parseSignedClaims()` | 0.12.0 | Method renamed |
| `Jwts.parser().setSigningKey()` | `Jwts.parser().verifyWith()` | 0.12.0 | Builder pattern changed |
| Spring Security `WebSecurityConfigurerAdapter` | Lambda DSL with `SecurityFilterChain` bean | Spring Security 6 | Already using new pattern |

**Deprecated/outdated:**
- `Jwts.parser().setSigningKey(key)` -- use `Jwts.parser().verifyWith(key).build()` instead
- `SignatureAlgorithm.HS256` enum -- no longer needed, auto-detected from key type
- `Jwts.builder().signWith(key, SignatureAlgorithm.HS256)` -- just use `signWith(key)`

## Open Questions

1. **Cookie path scoping for logout endpoint**
   - What we know: Refresh token cookie should be scoped to `/api/v1/auth/refresh` to minimize transmission. But the logout endpoint at `/api/v1/auth/logout` also needs to read the cookie.
   - What's unclear: Should cookie path be `/api/v1/auth/` (broader) or should logout also use `/api/v1/auth/refresh` path?
   - Recommendation: Set cookie path to `/api/v1/auth` so both refresh and logout endpoints receive it.

2. **Refresh token as JWT vs opaque string**
   - What we know: FSD mentions token_hash (SHA-256) stored in DB, implying opaque tokens.
   - What's unclear: Should refresh token be a JWT (self-contained expiry) or UUID (simpler, expiry in DB only)?
   - Recommendation: Use UUID for refresh tokens -- simpler, expiry tracked in DB, no need for JWT overhead. Hash with SHA-256 before storing.

3. **SUPER_ADMIN seeded in V2 needs must_change_password flag**
   - What we know: V2 migration seeds a SUPER_ADMIN with pre-computed BCrypt hash. After V3 adds `must_change_password`, the seeded admin should have it set to TRUE.
   - Recommendation: V3 migration can set `UPDATE user SET must_change_password = TRUE WHERE role = 'SUPER_ADMIN'` to force initial password change.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test + Spring Security Test |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.auth.*" -x processTestResources` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Login with valid credentials returns JWT + cookie | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.loginSuccess"` | Wave 0 |
| AUTH-01 | Login with wrong password returns 401 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.loginInvalidCredentials"` | Wave 0 |
| AUTH-02 | Refresh with valid cookie rotates tokens | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.refreshSuccess"` | Wave 0 |
| AUTH-02 | Refresh with reused token invalidates all | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.refreshTokenReuse"` | Wave 0 |
| AUTH-03 | Logout clears cookie and invalidates RT | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.logoutSuccess"` | Wave 0 |
| AUTH-04 | 5 failed attempts locks account for 15 min | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.accountLockout"` | Wave 0 |
| AUTH-04 | Lockout counter resets on success | unit | `./gradlew test --tests "com.micesign.auth.AuthServiceTest.lockoutResetOnSuccess"` | Wave 0 |
| AUTH-05 | Session persists via refresh on init | manual-only | Frontend test: browser refresh preserves session | N/A |
| AUTH-06 | Password change with valid current password | integration | `./gradlew test --tests "com.micesign.auth.PasswordControllerTest.changeSuccess"` | Wave 0 |
| AUTH-06 | Password change invalidates other sessions | integration | `./gradlew test --tests "com.micesign.auth.PasswordControllerTest.changeInvalidatesOthers"` | Wave 0 |
| AUTH-07 | Admin can reset user password | integration | `./gradlew test --tests "com.micesign.auth.AdminPasswordResetTest.resetSuccess"` | Wave 0 |
| AUTH-07 | ADMIN cannot reset SUPER_ADMIN password | integration | `./gradlew test --tests "com.micesign.auth.AdminPasswordResetTest.adminCannotResetSuperAdmin"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.auth.*"`
- **Per wave merge:** `cd backend && ./gradlew test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/auth/AuthControllerTest.java` -- covers AUTH-01, AUTH-02, AUTH-03, AUTH-04
- [ ] `backend/src/test/java/com/micesign/auth/AuthServiceTest.java` -- covers AUTH-04 unit logic
- [ ] `backend/src/test/java/com/micesign/auth/PasswordControllerTest.java` -- covers AUTH-06
- [ ] `backend/src/test/java/com/micesign/auth/AdminPasswordResetTest.java` -- covers AUTH-07
- [ ] `backend/src/test/resources/db/testmigration/V3__add_auth_columns.sql` -- H2-compatible version of V3 migration
- [ ] Framework install: jjwt dependencies in build.gradle.kts

## Project Constraints (from CLAUDE.md)

- **Tech stack locked:** Java 17 + Spring Boot 3.x + Spring Security + JWT + JPA/Hibernate + Gradle (backend), React 18 + Vite + TypeScript + Zustand + TanStack Query v5 + TailwindCSS (frontend)
- **JWT architecture:** Access Token in memory (30min TTL), Refresh Token in HttpOnly/Secure/SameSite=Strict cookie (14 days TTL) with rotation
- **RBAC:** Three roles -- SUPER_ADMIN, ADMIN, USER. Use `@PreAuthorize` annotations
- **API envelope:** `{"success": true, "data": {...}, "error": null}` -- all auth endpoints must follow this
- **API prefix:** `/api/v1` -- auth routes at `/api/v1/auth/*`
- **Flyway:** All schema changes through migration files
- **No Lombok:** Use Java records for DTOs
- **No Spring WebFlux:** Stick with servlet stack
- **Form templates:** Hardcoded React components (not relevant to Phase 2 but preserved as constraint)
- **DB:** MariaDB 10.11 LTS with utf8mb4/utf8mb4_unicode_ci
- **H2 MariaDB mode** for integration tests with adapted test migrations

## Sources

### Primary (HIGH confidence)
- FSD FN-AUTH-001 through FN-AUTH-005 -- auth API contracts, error codes, processing logic
- PRD Section 11.2 -- DB schema DDL for refresh_token, user tables
- CONTEXT.md D-01 through D-44 -- all locked implementation decisions
- Existing codebase -- SecurityConfig.java, client.ts, build.gradle.kts, V1 migration

### Secondary (MEDIUM confidence)
- [Maven Central jjwt-api](https://central.sonatype.com/artifact/io.jsonwebtoken/jjwt-api/versions) -- verified 0.12.6 and 0.13.0 exist
- [jjwt GitHub](https://github.com/jwtk/jjwt) -- API patterns for 0.12.x
- npm registry -- verified react-i18next 17.0.2, i18next 26.0.3, @hookform/resolvers 5.2.2

### Tertiary (LOW confidence)
- Session cookie behavior (`maxAge` omission) -- needs validation in actual Spring ResponseCookie implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified against registry, locked by CONTEXT.md decisions
- Architecture: HIGH -- patterns derive from existing codebase conventions + FSD spec
- Pitfalls: HIGH -- well-known JWT/auth issues; refresh race condition documented in STATE.md as concern

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, no fast-moving dependencies)
