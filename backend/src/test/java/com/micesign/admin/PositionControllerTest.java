package com.micesign.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.dto.position.CreatePositionRequest;
import com.micesign.dto.position.ReorderPositionsRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PositionControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;

    private String superAdminToken;

    @BeforeEach
    void setUp() {
        // Clean test positions (keep seeded 1-7)
        jdbcTemplate.update("DELETE FROM position WHERE id > 7");
        superAdminToken = tokenHelper.superAdminToken();
    }

    @Test
    void createPosition_returns201() throws Exception {
        CreatePositionRequest request = new CreatePositionRequest("신규직급");

        mockMvc.perform(post("/api/v1/admin/positions")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.name").value("신규직급"))
            .andExpect(jsonPath("$.data.sortOrder").value(8)); // max(7) + 1
    }

    @Test
    void createPosition_duplicateName_returns400() throws Exception {
        CreatePositionRequest request = new CreatePositionRequest("사원");

        mockMvc.perform(post("/api/v1/admin/positions")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("ORG_DUPLICATE_NAME"));
    }

    @Test
    void reorderPositions_updatesSortOrder() throws Exception {
        // Reverse order of first two positions
        ReorderPositionsRequest request = new ReorderPositionsRequest(List.of(2L, 1L, 3L, 4L, 5L, 6L, 7L));

        mockMvc.perform(put("/api/v1/admin/positions/reorder")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        // Verify sort order updated
        Integer sortOrder1 = jdbcTemplate.queryForObject(
            "SELECT sort_order FROM position WHERE id = 1", Integer.class);
        Integer sortOrder2 = jdbcTemplate.queryForObject(
            "SELECT sort_order FROM position WHERE id = 2", Integer.class);
        org.assertj.core.api.Assertions.assertThat(sortOrder2).isEqualTo(0);
        org.assertj.core.api.Assertions.assertThat(sortOrder1).isEqualTo(1);
    }

    @Test
    void deactivatePosition_withActiveUsers_returns400() throws Exception {
        // Position 7 (대표이사) has the seeded admin user
        mockMvc.perform(patch("/api/v1/admin/positions/7/deactivate")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("ORG_HAS_ACTIVE_USERS"));
    }

    @Test
    void deactivatePosition_noUsers_returns200() throws Exception {
        // Create a new position, then deactivate it
        jdbcTemplate.update("INSERT INTO position (id, name, sort_order, is_active) VALUES (99, '임시직급', 99, TRUE)");

        mockMvc.perform(patch("/api/v1/admin/positions/99/deactivate")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }
}
