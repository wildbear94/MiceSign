package com.micesign.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.dto.department.CreateDepartmentRequest;
import com.micesign.dto.department.UpdateDepartmentRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DepartmentControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    private String superAdminToken;

    @BeforeEach
    void setUp() {
        // Clean up test departments (keep seeded ones)
        jdbcTemplate.update("DELETE FROM \"user\" WHERE employee_no LIKE 'TEST%'");
        jdbcTemplate.update("DELETE FROM department WHERE id > 7");
        superAdminToken = tokenHelper.superAdminToken();
    }

    @Test
    void createDepartment_returns201() throws Exception {
        CreateDepartmentRequest request = new CreateDepartmentRequest("신규부서", 1L, 10);

        mockMvc.perform(post("/api/v1/admin/departments")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.name").value("신규부서"));
    }

    @Test
    void createDepartment_duplicateName_returns400() throws Exception {
        CreateDepartmentRequest request = new CreateDepartmentRequest("대표이사실", null, 1);

        mockMvc.perform(post("/api/v1/admin/departments")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("ORG_DUPLICATE_NAME"));
    }

    @Test
    void createDepartment_depthExceeded_returns400() throws Exception {
        // Create depth 1 child under dept 2 (which is already depth 1 under dept 1)
        CreateDepartmentRequest level2 = new CreateDepartmentRequest("하위부서2", 2L, 1);
        mockMvc.perform(post("/api/v1/admin/departments")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(level2)))
            .andExpect(status().isCreated());

        // Get the ID of the created dept
        Long level2Id = jdbcTemplate.queryForObject(
            "SELECT id FROM department WHERE name = '하위부서2'", Long.class);

        // Try to create depth 3 - should fail (max 3 levels = depth 0,1,2)
        CreateDepartmentRequest level3 = new CreateDepartmentRequest("하위부서3", level2Id, 1);
        mockMvc.perform(post("/api/v1/admin/departments")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(level3)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("ORG_DEPTH_EXCEEDED"));
    }

    @Test
    void getDepartmentTree_returnsNestedStructure() throws Exception {
        mockMvc.perform(get("/api/v1/admin/departments")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data[0].name").value("대표이사실"))
            .andExpect(jsonPath("$.data[0].children").isArray())
            .andExpect(jsonPath("$.data[0].children[0].name").exists());
    }

    @Test
    void getDepartmentMembers_returnsUserList() throws Exception {
        // Department 1 has the seeded admin user
        mockMvc.perform(get("/api/v1/admin/departments/1/members")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data[0].name").value("시스템관리자"));
    }

    @Test
    void deactivateDepartment_withActiveChildren_returns400() throws Exception {
        // Department 1 (대표이사실) has active children (2-7)
        mockMvc.perform(patch("/api/v1/admin/departments/1/deactivate")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("ORG_HAS_ACTIVE_CHILDREN"));
    }

    @Test
    void updateDepartment_circularReference_returns400() throws Exception {
        // Try to set dept 1 (root) parent to dept 2 (its child) -> circular
        UpdateDepartmentRequest request = new UpdateDepartmentRequest("대표이사실", 2L, 1);
        mockMvc.perform(put("/api/v1/admin/departments/1")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("ORG_CIRCULAR_REF"));
    }

    @Test
    void getUserCount_returnsCorrectActiveCount() throws Exception {
        // Department 1 has 1 active user (seeded admin)
        mockMvc.perform(get("/api/v1/admin/departments/1/user-count")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.activeUserCount").value(1));
    }
}
