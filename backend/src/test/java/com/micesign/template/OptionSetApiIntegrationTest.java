package com.micesign.template;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.dto.option.CreateOptionSetRequest;
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
class OptionSetApiIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    private String adminToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM option_item");
        jdbcTemplate.update("DELETE FROM option_set");
        adminToken = tokenHelper.superAdminToken();
    }

    private CreateOptionSetRequest sampleRequest(String name) {
        return new CreateOptionSetRequest(name, "테스트 옵션 세트",
                List.of(
                        new CreateOptionSetRequest.OptionItemRequest("opt1", "옵션 1"),
                        new CreateOptionSetRequest.OptionItemRequest("opt2", "옵션 2")
                ));
    }

    @Test
    void createOptionSet_returns201() throws Exception {
        CreateOptionSetRequest request = sampleRequest("결재 유형");

        mockMvc.perform(post("/api/v1/admin/option-sets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("결재 유형"))
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].value").value("opt1"));
    }

    @Test
    void listOptionSets_returnsActiveList() throws Exception {
        // Create two option sets
        mockMvc.perform(post("/api/v1/admin/option-sets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest("세트 A"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/admin/option-sets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest("세트 B"))))
                .andExpect(status().isCreated());

        // List
        mockMvc.perform(get("/api/v1/admin/option-sets")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void createOptionSet_duplicateName_returns400() throws Exception {
        CreateOptionSetRequest request = sampleRequest("중복 테스트");

        // First creation succeeds
        mockMvc.perform(post("/api/v1/admin/option-sets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Duplicate name fails
        mockMvc.perform(post("/api/v1/admin/option-sets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("OPT_NAME_DUPLICATE"));
    }

    @Test
    void getOptionSetById_returnsDetail() throws Exception {
        // Create
        String body = mockMvc.perform(post("/api/v1/admin/option-sets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest("조회 테스트"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long id = objectMapper.readTree(body).get("data").get("id").asLong();

        // Get by ID
        mockMvc.perform(get("/api/v1/admin/option-sets/" + id)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("조회 테스트"))
                .andExpect(jsonPath("$.data.items.length()").value(2));
    }
}
