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
class UserManagementControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void createUser_returns201_withMustChangePassword() { /* mustChangePassword = true */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void getUserList_paginatedWithFilters() { /* GET / with keyword, departmentId, role, status, page, size */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void getUserDetail_returnsFullProfile() { /* GET /{id} -> UserDetailResponse */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void updateUser_savesChanges() { /* PUT /{id} -> updated UserDetailResponse */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void deactivateUser_setsInactive() { /* PATCH /{id}/deactivate -> status INACTIVE */ }
}
