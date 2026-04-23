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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentSearchStatusFilterTest {

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
    void multipleStatusParams_returns200_withTotalElementsField() throws Exception {
        // Plan 30-02 에서 실제 SUBMITTED+APPROVED 복수 필터링 검증 추가 예정
        String token = tokenHelper.superAdminToken();
        mockMvc.perform(get("/api/v1/documents/search")
                .param("status", "SUBMITTED")
                .param("status", "APPROVED")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalElements").exists())
            .andExpect(jsonPath("$.data.pageable.pageSize").value(20));
    }

    @Test
    void singleStatusParam_backwardCompatible_returns200() throws Exception {
        // Plan 30-02 에서 실제 단일 SUBMITTED 필터링 + 역호환 검증 추가 예정 (I7 invariant)
        String token = tokenHelper.superAdminToken();
        mockMvc.perform(get("/api/v1/documents/search")
                .param("status", "SUBMITTED")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    // Plan 30-02 에서 추가될 테스트들:
    // - twoStatuses_filtersExactMatch
    // - noStatusParam_includesAllNonDraft (DRAFT gate 결합)
}
