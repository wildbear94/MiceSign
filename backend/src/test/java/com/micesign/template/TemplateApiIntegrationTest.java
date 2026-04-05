package com.micesign.template;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.dto.template.CreateTemplateRequest;
import com.micesign.dto.template.FieldConfig;
import com.micesign.dto.template.FieldDefinition;
import com.micesign.dto.template.SchemaDefinition;
import com.micesign.dto.template.UpdateTemplateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TemplateApiIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        // Clean up custom templates and schema versions from previous tests
        jdbcTemplate.update("DELETE FROM template_schema_version WHERE template_id IN (SELECT id FROM approval_template WHERE is_custom = TRUE)");
        jdbcTemplate.update("DELETE FROM approval_template WHERE is_custom = TRUE");
        adminToken = tokenHelper.superAdminToken();
        userToken = tokenHelper.userToken();
    }

    private SchemaDefinition sampleSchema() {
        FieldConfig config = new FieldConfig(
                null, 200, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition field = new FieldDefinition("f_title", "text", "제목", true, config);
        return new SchemaDefinition(1, List.of(field), List.of(), List.of());
    }

    @Test
    void createTemplate_returns201_withCustomCode() throws Exception {
        CreateTemplateRequest request = new CreateTemplateRequest(
                "테스트 양식", "TST", "테스트 설명", "일반", "document", sampleSchema());

        mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value(startsWith("CUSTOM_")))
                .andExpect(jsonPath("$.data.name").value("테스트 양식"))
                .andExpect(jsonPath("$.data.prefix").value("TST"))
                .andExpect(jsonPath("$.data.isCustom").value(true))
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.schemaDefinition.fields[0].type").value("text"));
    }

    @Test
    void createTemplate_duplicatePrefix_returns400() throws Exception {
        // Prefix GEN already exists from seed data
        CreateTemplateRequest request = new CreateTemplateRequest(
                "중복 양식", "GEN", "설명", null, null, sampleSchema());

        mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("TPL_PREFIX_DUPLICATE"));
    }

    @Test
    void updateTemplate_incrementsSchemaVersion() throws Exception {
        // Create template first
        CreateTemplateRequest createReq = new CreateTemplateRequest(
                "수정 테스트", "UPD", "설명", null, null, sampleSchema());

        MvcResult createResult = mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long templateId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("data").get("id").asLong();

        // Update with new schema
        FieldConfig newConfig = new FieldConfig(
                "내용을 입력하세요", 500, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition newField = new FieldDefinition("f_content", "textarea", "내용", true, newConfig);
        SchemaDefinition newSchema = new SchemaDefinition(2, List.of(newField), List.of(), List.of());
        UpdateTemplateRequest updateReq = new UpdateTemplateRequest(
                "수정된 양식", null, null, null, newSchema);

        mockMvc.perform(put("/api/v1/admin/templates/" + templateId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("수정된 양식"))
                .andExpect(jsonPath("$.data.schemaVersion").value(2))
                .andExpect(jsonPath("$.data.schemaDefinition.fields[0].type").value("textarea"));
    }

    @Test
    void getTemplateDetail_returnsSchemaDefinition() throws Exception {
        // Create template first
        CreateTemplateRequest createReq = new CreateTemplateRequest(
                "상세 조회 테스트", "DTL", "설명", "일반", "file", sampleSchema());

        MvcResult createResult = mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long templateId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("data").get("id").asLong();

        // Get detail
        mockMvc.perform(get("/api/v1/admin/templates/" + templateId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.schemaDefinition.fields[0].type").value("text"))
                .andExpect(jsonPath("$.data.category").value("일반"))
                .andExpect(jsonPath("$.data.icon").value("file"));
    }

    @Test
    void deactivateTemplate_setsInactive() throws Exception {
        // Create template first
        CreateTemplateRequest createReq = new CreateTemplateRequest(
                "비활성화 테스트", "DEA", "설명", null, null, sampleSchema());

        MvcResult createResult = mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long templateId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("data").get("id").asLong();

        // Deactivate
        mockMvc.perform(delete("/api/v1/admin/templates/" + templateId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify via detail - should show inactive
        mockMvc.perform(get("/api/v1/admin/templates/" + templateId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));
    }

    @Test
    void userCannotAccessAdminTemplateApi_returns403() throws Exception {
        CreateTemplateRequest request = new CreateTemplateRequest(
                "권한 테스트", "AUT", "설명", null, null, sampleSchema());

        mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getActiveTemplates_backwardCompatible() throws Exception {
        // Existing GET /api/v1/templates should still work
        mockMvc.perform(get("/api/v1/templates")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }
}
