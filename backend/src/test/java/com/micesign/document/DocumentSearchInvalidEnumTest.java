package com.micesign.document;

import com.micesign.admin.TestTokenHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentSearchInvalidEnumTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM notification_log");
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
    }

    @Test
    void invalidStatusEnum_returns400_notAServerError() throws Exception {
        String token = tokenHelper.superAdminToken();
        mockMvc.perform(get("/api/v1/documents/search")
                .param("status", "INVALID_ENUM_VALUE")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.message").value(containsString("상태 값이 올바르지 않습니다")))
            // T-30-03: stack trace 유출 방지
            .andExpect(jsonPath("$.error.message").value(not(containsString("at com.micesign"))))
            .andExpect(jsonPath("$.error.message").value(not(containsString("Exception"))));
    }

    @Test
    void multipleValidStatuses_returns200() throws Exception {
        String token = tokenHelper.superAdminToken();
        mockMvc.perform(get("/api/v1/documents/search")
                .param("status", "SUBMITTED")
                .param("status", "APPROVED")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void blankStatusParameter_isFiltered_returns200() throws Exception {
        String token = tokenHelper.superAdminToken();
        mockMvc.perform(get("/api/v1/documents/search")
                .param("status", "")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void tabAll_withUserRole_returns403_AUTH_FORBIDDEN() throws Exception {
        // D-A7 회귀 보호 — USER 가 tab=all 호출 시 403
        String userToken = tokenHelper.tokenForRole(999L, "user999@test.com", "테스트유저",
            com.micesign.domain.enums.UserRole.USER, 2L);
        mockMvc.perform(get("/api/v1/documents/search")
                .param("tab", "all")
                .header("Authorization", "Bearer " + userToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void invalidDrafterIdType_returns400_viaHandler() throws Exception {
        // T-30-03: MethodArgumentTypeMismatchException 핸들러 작동 확인
        String token = tokenHelper.superAdminToken();
        mockMvc.perform(get("/api/v1/documents/search")
                .param("drafterId", "not-a-number")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.message").value(containsString("drafterId")));
    }
}
