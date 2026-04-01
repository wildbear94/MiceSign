package com.micesign.auth;

import com.micesign.domain.User;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.auth.LoginRequest;
import com.micesign.repository.UserRepository;
import com.micesign.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void lockoutResetOnSuccess() {
        // Setup: create a user with some failed login attempts
        User user = new User();
        user.setEmployeeNo("LOCKTEST001");
        user.setName("Lockout Test User");
        user.setEmail("lockout-reset@micesign.com");
        user.setPassword(passwordEncoder.encode("TestPass123!"));
        user.setDepartmentId(1L);
        user.setPositionId(1L);
        user.setRole(UserRole.USER);
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginCount(0);
        userRepository.save(user);

        // Fail 3 times
        for (int i = 0; i < 3; i++) {
            authService.login(new LoginRequest("lockout-reset@micesign.com", "wrongpass", false), "test");
        }

        // Verify failed count is 3
        User afterFails = userRepository.findByEmail("lockout-reset@micesign.com").orElseThrow();
        assertThat(afterFails.getFailedLoginCount()).isEqualTo(3);

        // Successful login resets counter
        AuthService.LoginResult result = authService.login(
                new LoginRequest("lockout-reset@micesign.com", "TestPass123!", false), "test");
        assertThat(result.success()).isTrue();

        User afterSuccess = userRepository.findByEmail("lockout-reset@micesign.com").orElseThrow();
        assertThat(afterSuccess.getFailedLoginCount()).isEqualTo(0);
    }
}
