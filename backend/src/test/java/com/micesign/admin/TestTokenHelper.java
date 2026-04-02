package com.micesign.admin;

import com.micesign.domain.User;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Test helper that generates JWT tokens for different roles.
 * Uses the real JwtTokenProvider to create valid tokens.
 */
@Component
public class TestTokenHelper {

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    public String superAdminToken() {
        return tokenForRole(1L, "admin@micesign.com", "시스템관리자", UserRole.SUPER_ADMIN, 1L);
    }

    public String adminToken() {
        return tokenForRole(100L, "testadmin@micesign.com", "테스트관리자", UserRole.ADMIN, 1L);
    }

    public String adminToken(Long userId) {
        return tokenForRole(userId, "testadmin@micesign.com", "테스트관리자", UserRole.ADMIN, 1L);
    }

    public String userToken() {
        return tokenForRole(200L, "testuser@micesign.com", "테스트사용자", UserRole.USER, 1L);
    }

    public String tokenForRole(Long userId, String email, String name, UserRole role, Long departmentId) {
        User user = new User();
        user.setId(userId);
        user.setEmail(email);
        user.setName(name);
        user.setRole(role);
        user.setDepartmentId(departmentId);
        user.setMustChangePassword(false);
        return jwtTokenProvider.generateAccessToken(user);
    }
}
