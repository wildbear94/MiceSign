package com.micesign.admin;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RbacEnforcementTest {

    @Autowired
    MockMvc mockMvc;

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void adminCannotCreateAdminRoleUser() { /* ADMIN creates user with role=ADMIN -> 400 AUTH_FORBIDDEN */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void adminCannotPromoteToAdmin() { /* ADMIN updates user role to ADMIN -> 400 AUTH_FORBIDDEN */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void userRoleBlocked_returns403() { /* USER role accessing /api/v1/admin/* -> 403 */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void selfDeactivation_blocked() { /* Admin deactivating self -> 400 ORG_SELF_DEACTIVATION */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void superAdminCanCreateAdminRoleUser() { /* SUPER_ADMIN creates ADMIN user -> 201 success */ }
}
