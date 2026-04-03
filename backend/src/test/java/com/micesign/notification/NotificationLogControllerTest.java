package com.micesign.notification;

import com.micesign.admin.TestTokenHelper;
import com.micesign.service.EmailService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationLogControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    @MockitoBean
    GoogleDriveService googleDriveService;

    @MockitoBean
    EmailService emailService;

    private String superAdminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM notification_log");

        superAdminToken = tokenHelper.superAdminToken();
        userToken = tokenHelper.userToken();

        // Insert test notification log entries
        jdbcTemplate.update(
            "INSERT INTO notification_log (recipient_id, recipient_email, event_type, document_id, subject, status, retry_count, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
            1L, "admin@test.com", "SUBMIT", null, "[MiceSign] Test - 결재 요청", "SUCCESS", 0
        );
        jdbcTemplate.update(
            "INSERT INTO notification_log (recipient_id, recipient_email, event_type, document_id, subject, status, retry_count, error_message, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            1L, "admin@test.com", "APPROVE", null, "[MiceSign] Test - 승인 완료", "FAILED", 2, "Connection refused"
        );
        jdbcTemplate.update(
            "INSERT INTO notification_log (recipient_id, recipient_email, event_type, document_id, subject, status, retry_count, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
            1L, "admin@test.com", "REJECT", null, "[MiceSign] Test - 반려", "PENDING", 0
        );
    }

    @Test
    void getNotificationLogs_returns200_forSuperAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/notifications")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.totalElements").value(3));
    }

    @Test
    void getNotificationLogs_returns403_forRegularUser() throws Exception {
        mockMvc.perform(get("/api/v1/admin/notifications")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void getNotificationLogs_filtersByStatus() throws Exception {
        mockMvc.perform(get("/api/v1/admin/notifications")
                        .param("status", "FAILED")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].status").value("FAILED"));
    }

    @Test
    void getNotificationLogs_filtersByEventType() throws Exception {
        mockMvc.perform(get("/api/v1/admin/notifications")
                        .param("eventType", "SUBMIT")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].eventType").value("SUBMIT"));
    }

    @Test
    void getNotificationLogs_filtersByDateRange() throws Exception {
        String today = java.time.LocalDate.now().toString();
        mockMvc.perform(get("/api/v1/admin/notifications")
                        .param("startDate", today)
                        .param("endDate", today)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(greaterThanOrEqualTo(3)));
    }

    @Test
    void getNotificationLogs_returnsRecipientName() throws Exception {
        mockMvc.perform(get("/api/v1/admin/notifications")
                        .param("status", "SUCCESS")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].recipientName").exists())
                .andExpect(jsonPath("$.data.content[0].recipientEmail").value("admin@test.com"));
    }

    @Test
    void resendNotification_returns200_forFailedNotification() throws Exception {
        // Get the FAILED notification ID
        Long failedId = jdbcTemplate.queryForObject(
            "SELECT id FROM notification_log WHERE status = 'FAILED' LIMIT 1", Long.class);

        mockMvc.perform(post("/api/v1/admin/notifications/" + failedId + "/resend")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void resendNotification_returns400_forNonFailedNotification() throws Exception {
        // Get the SUCCESS notification ID
        Long successId = jdbcTemplate.queryForObject(
            "SELECT id FROM notification_log WHERE status = 'SUCCESS' LIMIT 1", Long.class);

        mockMvc.perform(post("/api/v1/admin/notifications/" + successId + "/resend")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resendNotification_returns404_forNonExistentNotification() throws Exception {
        mockMvc.perform(post("/api/v1/admin/notifications/99999/resend")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getNotificationLogs_returns401_forUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/admin/notifications"))
                .andExpect(status().isUnauthorized());
    }
}
