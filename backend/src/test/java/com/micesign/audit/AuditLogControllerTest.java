package com.micesign.audit;

import com.micesign.admin.TestTokenHelper;
import com.micesign.common.AuditAction;
import com.micesign.service.GoogleDriveService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditLogControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    @MockitoBean
    GoogleDriveService googleDriveService;

    private String superAdminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM audit_log");

        superAdminToken = tokenHelper.superAdminToken();
        userToken = tokenHelper.userToken();

        // Insert test audit log entries
        jdbcTemplate.update(
            "INSERT INTO audit_log (user_id, action, target_type, target_id, detail, ip_address, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, NOW())",
            1L, AuditAction.DOCUMENT_CREATE, "DOCUMENT", 100L, "Template: GENERAL", "192.168.1.1"
        );
        jdbcTemplate.update(
            "INSERT INTO audit_log (user_id, action, target_type, target_id, detail, ip_address, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, NOW())",
            1L, AuditAction.DOCUMENT_SUBMIT, "DOCUMENT", 100L, "DocNumber: GEN-2026-0001", "192.168.1.1"
        );
        jdbcTemplate.update(
            "INSERT INTO audit_log (user_id, action, target_type, target_id, detail, ip_address, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, NOW())",
            null, AuditAction.LOGIN_FAILED, "USER", null, "Email: bad@test.com", "10.0.0.1"
        );
    }

    @Test
    void getAuditLogs_returns200_forSuperAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.totalElements").value(3));
    }

    @Test
    void getAuditLogs_returns403_forRegularUser() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void getAuditLogs_filtersByAction() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .param("action", AuditAction.DOCUMENT_CREATE)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].action").value(AuditAction.DOCUMENT_CREATE));
    }

    @Test
    void getAuditLogs_filtersByUserId() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .param("userId", "1")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2));
    }

    @Test
    void getAuditLogs_filtersByDateRange() throws Exception {
        // All entries are created NOW(), so today's date should include them
        String today = java.time.LocalDate.now().toString();
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .param("startDate", today)
                        .param("endDate", today)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(greaterThanOrEqualTo(3)));
    }

    @Test
    void getAuditLogs_returnsUserName() throws Exception {
        // userId=1 is the SUPER_ADMIN seeded user
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .param("action", AuditAction.DOCUMENT_CREATE)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].userName").exists());
    }

    @Test
    void getAuditLogs_returns401_forUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs"))
                .andExpect(status().isUnauthorized());
    }
}
