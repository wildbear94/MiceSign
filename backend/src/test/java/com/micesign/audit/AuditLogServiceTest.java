package com.micesign.audit;

import com.micesign.common.AuditAction;
import com.micesign.domain.AuditLog;
import com.micesign.repository.AuditLogRepository;
import com.micesign.service.AuditLogService;
import com.micesign.service.GoogleDriveService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@SpringBootTest
@ActiveProfiles("test")
class AuditLogServiceTest {

    @Autowired
    AuditLogService auditLogService;

    @Autowired
    AuditLogRepository auditLogRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @MockitoBean
    GoogleDriveService googleDriveService;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM audit_log");
    }

    @Test
    void log_createsAuditLogEntry_withCorrectFields() {
        // Set up mock request context
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.1");
        request.addHeader("User-Agent", "TestBrowser/1.0");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        try {
            auditLogService.log(1L, AuditAction.DOCUMENT_CREATE, "DOCUMENT", 100L, "Template: GENERAL");

            List<AuditLog> logs = auditLogRepository.findAll();
            assertThat(logs).hasSize(1);

            AuditLog entry = logs.get(0);
            assertThat(entry.getUserId()).isEqualTo(1L);
            assertThat(entry.getAction()).isEqualTo(AuditAction.DOCUMENT_CREATE);
            assertThat(entry.getTargetType()).isEqualTo("DOCUMENT");
            assertThat(entry.getTargetId()).isEqualTo(100L);
            assertThat(entry.getDetail()).isEqualTo("Template: GENERAL");
            assertThat(entry.getIpAddress()).isEqualTo("192.168.1.1");
            assertThat(entry.getUserAgent()).isEqualTo("TestBrowser/1.0");
            assertThat(entry.getCreatedAt()).isNotNull();
        } finally {
            RequestContextHolder.resetRequestAttributes();
        }
    }

    @Test
    void log_capturesXForwardedForIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "203.0.113.50, 70.41.3.18");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        try {
            auditLogService.log(1L, AuditAction.LOGIN_SUCCESS, "USER", 1L, null);

            List<AuditLog> logs = auditLogRepository.findAll();
            assertThat(logs).hasSize(1);
            assertThat(logs.get(0).getIpAddress()).isEqualTo("203.0.113.50");
        } finally {
            RequestContextHolder.resetRequestAttributes();
        }
    }

    @Test
    void log_swallowsExceptions_neverFailsCaller() {
        // No request context set — this means RequestContextHolder returns null
        // which could cause NPE, but the service should swallow it
        RequestContextHolder.resetRequestAttributes();

        // Should not throw
        assertThatCode(() ->
            auditLogService.log(1L, AuditAction.DOCUMENT_SUBMIT, "DOCUMENT", 1L, "test")
        ).doesNotThrowAnyException();
    }

    @Test
    void log_worksWithNullUserId() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        try {
            auditLogService.log(null, AuditAction.LOGIN_FAILED, "USER", null, "Email: unknown@test.com");

            List<AuditLog> logs = auditLogRepository.findAll();
            assertThat(logs).hasSize(1);
            assertThat(logs.get(0).getUserId()).isNull();
            assertThat(logs.get(0).getAction()).isEqualTo(AuditAction.LOGIN_FAILED);
        } finally {
            RequestContextHolder.resetRequestAttributes();
        }
    }
}
