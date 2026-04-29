package com.micesign.service;

import com.micesign.common.AuditAction;
import com.micesign.domain.AuditLog;
import com.micesign.domain.RefreshToken;
import com.micesign.domain.User;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.auth.*;
import com.micesign.repository.AuditLogRepository;
import com.micesign.repository.RefreshTokenRepository;
import com.micesign.repository.UserRepository;
import com.micesign.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
@Transactional
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${jwt.refresh-token-ttl}")
    private long refreshTokenTtl;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       AuditLogRepository auditLogRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * Result object for login — carries either success data or error details.
     */
    public record LoginResult(
            boolean success,
            LoginResponse response,
            String rawRefreshToken,
            AuthErrorResponse error
    ) {
        public static LoginResult ok(LoginResponse response, String rawRefreshToken) {
            return new LoginResult(true, response, rawRefreshToken, null);
        }

        public static LoginResult fail(AuthErrorResponse error) {
            return new LoginResult(false, null, null, error);
        }
    }

    public LoginResult login(LoginRequest request, String deviceInfo) {
        // 1. Find user by email
        User user = userRepository.findByEmail(request.email()).orElse(null);
        if (user == null) {
            return LoginResult.fail(new AuthErrorResponse(
                    "AUTH_INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.", null, null));
        }

        // 2. Check if account is inactive
        if (user.getStatus() != UserStatus.ACTIVE) {
            return LoginResult.fail(new AuthErrorResponse(
                    "AUTH_INVALID_CREDENTIALS", "비활성화된 계정입니다.", null, null));
        }

        // 3. Check if account is locked
        if (user.getLockedUntil() != null) {
            if (user.getLockedUntil().isAfter(LocalDateTime.now())) {
                return LoginResult.fail(new AuthErrorResponse(
                        "AUTH_ACCOUNT_LOCKED", "계정이 잠겼습니다. 잠시 후 다시 시도해주세요.",
                        null, user.getLockedUntil()));
            }
            // Lockout expired — reset
            user.setFailedLoginCount(0);
            user.setLockedUntil(null);
        }

        // 4. Verify password
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            return handleFailedLogin(user);
        }

        // 5. Successful login — reset counters
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // Audit log for successful login (AUD-01)
        AuditLog loginAudit = new AuditLog();
        loginAudit.setUserId(user.getId());
        loginAudit.setAction(AuditAction.USER_LOGIN);
        loginAudit.setTargetType("USER");
        loginAudit.setTargetId(user.getId());
        String safeEmail = user.getEmail().replace("\\", "\\\\").replace("\"", "\\\"");
        String safeDevice = deviceInfo != null ? deviceInfo.replace("\\", "\\\\").replace("\"", "\\\"") : "";
        loginAudit.setDetail("{\"email\":\"" + safeEmail + "\",\"deviceInfo\":\"" + safeDevice + "\"}");
        auditLogRepository.save(loginAudit);

        // 6. Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String rawRefreshToken = UUID.randomUUID().toString();
        String tokenHash = hashToken(rawRefreshToken);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(user.getId());
        refreshToken.setTokenHash(tokenHash);
        refreshToken.setDeviceInfo(deviceInfo);
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenTtl / 1000));
        refreshTokenRepository.save(refreshToken);

        LoginResponse loginResponse = new LoginResponse(accessToken, buildUserProfile(user));
        return LoginResult.ok(loginResponse, rawRefreshToken);
    }

    public record RefreshResult(
            boolean success,
            RefreshResponse response,
            String rawRefreshToken,
            AuthErrorResponse error
    ) {
        public static RefreshResult ok(RefreshResponse response, String rawRefreshToken) {
            return new RefreshResult(true, response, rawRefreshToken, null);
        }

        public static RefreshResult fail(AuthErrorResponse error) {
            return new RefreshResult(false, null, null, error);
        }
    }

    public RefreshResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return RefreshResult.fail(new AuthErrorResponse(
                    "AUTH_TOKEN_MISSING", "Refresh token이 없습니다.", null, null));
        }

        String tokenHash = hashToken(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash).orElse(null);

        if (stored == null) {
            // Possible token reuse attack — invalidate all tokens for safety
            // We cannot determine the user from an unknown token, so just return error
            return RefreshResult.fail(new AuthErrorResponse(
                    "AUTH_TOKEN_INVALID", "유효하지 않은 refresh token입니다.", null, null));
        }

        // Check expiration
        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(stored);
            return RefreshResult.fail(new AuthErrorResponse(
                    "AUTH_TOKEN_EXPIRED", "Refresh token이 만료되었습니다.", null, null));
        }

        // Token rotation: delete old, create new
        Long userId = stored.getUserId();
        String deviceInfo = stored.getDeviceInfo();
        refreshTokenRepository.delete(stored);

        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            return RefreshResult.fail(new AuthErrorResponse(
                    "AUTH_INVALID_CREDENTIALS", "사용자를 찾을 수 없습니다.", null, null));
        }

        // Generate new tokens
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String newRawToken = UUID.randomUUID().toString();
        String newTokenHash = hashToken(newRawToken);

        RefreshToken newRefreshToken = new RefreshToken();
        newRefreshToken.setUserId(userId);
        newRefreshToken.setTokenHash(newTokenHash);
        newRefreshToken.setDeviceInfo(deviceInfo);
        newRefreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenTtl / 1000));
        refreshTokenRepository.save(newRefreshToken);

        RefreshResponse refreshResponse = new RefreshResponse(accessToken, buildUserProfile(user));
        return RefreshResult.ok(refreshResponse, newRawToken);
    }

    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        String tokenHash = hashToken(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(stored -> {
                    Long userId = stored.getUserId();
                    refreshTokenRepository.delete(stored);

                    // Audit log for logout (AUD-01)
                    AuditLog logoutAudit = new AuditLog();
                    logoutAudit.setUserId(userId);
                    logoutAudit.setAction(AuditAction.USER_LOGOUT);
                    logoutAudit.setTargetType("USER");
                    logoutAudit.setTargetId(userId);
                    logoutAudit.setDetail("{\"action\":\"logout\"}");
                    auditLogRepository.save(logoutAudit);
                });
    }

    // ---- Private helpers ----

    private LoginResult handleFailedLogin(User user) {
        int newCount = user.getFailedLoginCount() + 1;
        user.setFailedLoginCount(newCount);

        if (newCount >= MAX_FAILED_ATTEMPTS) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
            userRepository.save(user);

            // Audit log for lockout event (D-41: append-only audit_log)
            AuditLog auditLog = new AuditLog();
            auditLog.setUserId(user.getId());
            auditLog.setAction("ACCOUNT_LOCKED");
            auditLog.setTargetType("USER");
            auditLog.setTargetId(user.getId());
            auditLog.setDetail("Failed login count reached " + MAX_FAILED_ATTEMPTS);
            auditLogRepository.save(auditLog);

            return LoginResult.fail(new AuthErrorResponse(
                    "AUTH_ACCOUNT_LOCKED", "로그인 실패 횟수 초과로 계정이 잠겼습니다.",
                    0, user.getLockedUntil()));
        }

        userRepository.save(user);
        int remaining = MAX_FAILED_ATTEMPTS - newCount;
        return LoginResult.fail(new AuthErrorResponse(
                "AUTH_INVALID_CREDENTIALS",
                "이메일 또는 비밀번호가 올바르지 않습니다. (남은 시도: " + remaining + "회)",
                remaining, null));
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private UserProfileDto buildUserProfile(User user) {
        // Phase 34 (D-F2) — null-safe LAZY join (DocumentMapper L21~24 SoT pattern).
        // Class-level @Transactional (L26) keeps the LAZY proxy attached for both
        // login() and refresh() call paths.
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
                departmentName,            // Phase 34 (D-F2)
                positionName               // Phase 34 (D-F2)
        );
    }
}
