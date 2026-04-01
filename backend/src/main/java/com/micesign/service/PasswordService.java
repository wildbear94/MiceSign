package com.micesign.service;

import com.micesign.domain.RefreshToken;
import com.micesign.domain.User;
import com.micesign.domain.enums.UserRole;
import com.micesign.dto.auth.AdminPasswordResetRequest;
import com.micesign.dto.auth.PasswordChangeRequest;
import com.micesign.repository.RefreshTokenRepository;
import com.micesign.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.List;
import java.util.regex.Pattern;

@Service
@Transactional
public class PasswordService {

    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final Pattern UPPERCASE_PATTERN = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile("[a-z]");
    private static final Pattern DIGIT_PATTERN = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL_PATTERN = Pattern.compile("[!@#$%^&*()_+\\-=\\[\\]{}|;:',.<>?/~]");

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordService(UserRepository userRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Result object for password operations.
     */
    public record PasswordResult(boolean success, String errorCode, String errorMessage) {
        public static PasswordResult ok() {
            return new PasswordResult(true, null, null);
        }

        public static PasswordResult fail(String code, String message) {
            return new PasswordResult(false, code, message);
        }
    }

    /**
     * Validates password strength per D-27:
     * - Minimum 8 characters
     * - Contains at least 2 of: uppercase, lowercase, digit, special character
     */
    public PasswordResult validatePasswordStrength(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            return PasswordResult.fail("AUTH_WEAK_PASSWORD",
                    "비밀번호는 최소 " + MIN_PASSWORD_LENGTH + "자 이상이어야 합니다.");
        }

        int categoryCount = 0;
        if (UPPERCASE_PATTERN.matcher(password).find()) categoryCount++;
        if (LOWERCASE_PATTERN.matcher(password).find()) categoryCount++;
        if (DIGIT_PATTERN.matcher(password).find()) categoryCount++;
        if (SPECIAL_PATTERN.matcher(password).find()) categoryCount++;

        if (categoryCount < 2) {
            return PasswordResult.fail("AUTH_WEAK_PASSWORD",
                    "비밀번호는 대문자, 소문자, 숫자, 특수문자 중 2종류 이상을 포함해야 합니다.");
        }

        return PasswordResult.ok();
    }

    /**
     * Changes the user's password (D-31).
     * Validates current password, enforces strength rules, invalidates other sessions (D-32).
     */
    public PasswordResult changePassword(Long userId, PasswordChangeRequest request, String currentTokenHash) {
        // 1. Validate password confirmation
        if (!request.newPassword().equals(request.confirmPassword())) {
            return PasswordResult.fail("AUTH_PASSWORD_MISMATCH", "새 비밀번호가 일치하지 않습니다.");
        }

        // 2. Find user
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return PasswordResult.fail("AUTH_INVALID_CREDENTIALS", "사용자를 찾을 수 없습니다.");
        }

        // 3. Verify current password
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            return PasswordResult.fail("AUTH_WRONG_PASSWORD", "현재 비밀번호가 올바르지 않습니다.");
        }

        // 4. Validate new password strength
        PasswordResult strengthResult = validatePasswordStrength(request.newPassword());
        if (!strengthResult.success()) {
            return strengthResult;
        }

        // 5. Update password
        user.setPassword(passwordEncoder.encode(request.newPassword()));

        // 6. Clear force-change flag (D-30)
        user.setMustChangePassword(false);

        // 7. Invalidate all OTHER refresh tokens (D-32) — keep current session
        List<RefreshToken> allTokens = refreshTokenRepository.findAllByUserId(userId);
        for (RefreshToken token : allTokens) {
            if (!token.getTokenHash().equals(currentTokenHash)) {
                refreshTokenRepository.delete(token);
            }
        }

        // 8. Save user
        userRepository.save(user);

        return PasswordResult.ok();
    }

    /**
     * Admin resets a target user's password (D-29).
     * Sets mustChangePassword=true, invalidates all sessions.
     */
    public PasswordResult adminResetPassword(Long adminUserId, Long targetUserId, AdminPasswordResetRequest request) {
        // 1. Load admin user and verify role
        User admin = userRepository.findById(adminUserId).orElse(null);
        if (admin == null) {
            return PasswordResult.fail("AUTH_INVALID_CREDENTIALS", "관리자를 찾을 수 없습니다.");
        }
        if (admin.getRole() != UserRole.ADMIN && admin.getRole() != UserRole.SUPER_ADMIN) {
            return PasswordResult.fail("AUTH_FORBIDDEN", "관리자 권한이 필요합니다.");
        }

        // 2. Load target user
        User target = userRepository.findById(targetUserId).orElse(null);
        if (target == null) {
            return PasswordResult.fail("AUTH_INVALID_CREDENTIALS", "대상 사용자를 찾을 수 없습니다.");
        }

        // 3. ADMIN cannot reset SUPER_ADMIN password
        if (target.getRole() == UserRole.SUPER_ADMIN && admin.getRole() == UserRole.ADMIN) {
            return PasswordResult.fail("AUTH_FORBIDDEN", "ADMIN은 SUPER_ADMIN의 비밀번호를 초기화할 수 없습니다.");
        }

        // 4. Validate password strength
        PasswordResult strengthResult = validatePasswordStrength(request.newPassword());
        if (!strengthResult.success()) {
            return strengthResult;
        }

        // 5. Set new password
        target.setPassword(passwordEncoder.encode(request.newPassword()));

        // 6. Set force-change flag (D-29/D-30)
        target.setMustChangePassword(true);

        // 7. Invalidate ALL refresh tokens for target user — force re-login
        refreshTokenRepository.deleteByUserId(targetUserId);

        // 8. Save target user
        userRepository.save(target);

        return PasswordResult.ok();
    }

    /**
     * Unlocks a locked account (D-38).
     */
    public PasswordResult unlockAccount(Long adminUserId, Long targetUserId) {
        // 1. Verify admin role
        User admin = userRepository.findById(adminUserId).orElse(null);
        if (admin == null) {
            return PasswordResult.fail("AUTH_INVALID_CREDENTIALS", "관리자를 찾을 수 없습니다.");
        }
        if (admin.getRole() != UserRole.ADMIN && admin.getRole() != UserRole.SUPER_ADMIN) {
            return PasswordResult.fail("AUTH_FORBIDDEN", "관리자 권한이 필요합니다.");
        }

        // 2. Load target user
        User target = userRepository.findById(targetUserId).orElse(null);
        if (target == null) {
            return PasswordResult.fail("AUTH_INVALID_CREDENTIALS", "대상 사용자를 찾을 수 없습니다.");
        }

        // 3. Reset lockout (D-38)
        target.setFailedLoginCount(0);
        target.setLockedUntil(null);
        userRepository.save(target);

        return PasswordResult.ok();
    }

    /**
     * Hashes a raw token using SHA-256 (same algorithm as AuthService).
     */
    public static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
