package com.micesign.template;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.dto.template.CreateTemplateRequest;
import com.micesign.dto.template.FieldConfig;
import com.micesign.dto.template.FieldDefinition;
import com.micesign.dto.template.SchemaDefinition;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TemplateSchemaControllerTest {

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
        jdbcTemplate.update("DELETE FROM template_schema_version WHERE template_id IN (SELECT id FROM approval_template WHERE is_custom = TRUE)");
        jdbcTemplate.update("DELETE FROM approval_template WHERE is_custom = TRUE");
        adminToken = tokenHelper.superAdminToken();
        userToken = tokenHelper.userToken();
    }

    private SchemaDefinition sampleSchema() {
        FieldConfig textConfig = new FieldConfig(
                "제목을 입력하세요", 200, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition textField = new FieldDefinition("f_title", "text", "제목", true, textConfig);

        FieldConfig numberConfig = new FieldConfig(
                null, null, 0L, 1000000L, "원", null, null, null, null, null, null, null);
        FieldDefinition numberField = new FieldDefinition("f_amount", "number", "금액", true, numberConfig);

        return new SchemaDefinition(1, List.of(textField, numberField), List.of(), List.of());
    }

    private String createCustomTemplate(String name, String prefix) throws Exception {
        CreateTemplateRequest request = new CreateTemplateRequest(
                name, prefix, "테스트 설명", "일반", "document", sampleSchema());

        MvcResult result = mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("code").asText();
    }

    @Test
    void getTemplateSchema_returnsSchemaForCustomTemplate() throws Exception {
        String code = createCustomTemplate("스키마 조회 테스트", "SCH");

        mockMvc.perform(get("/api/v1/templates/" + code + "/schema")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.version").value(1))
                .andExpect(jsonPath("$.data.fields").isArray())
                .andExpect(jsonPath("$.data.fields.length()").value(2))
                .andExpect(jsonPath("$.data.fields[0].id").value("f_title"))
                .andExpect(jsonPath("$.data.fields[0].type").value("text"))
                .andExpect(jsonPath("$.data.fields[1].id").value("f_amount"))
                .andExpect(jsonPath("$.data.fields[1].type").value("number"));
    }

    @Test
    void getTemplateSchema_nonExistentCode_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/templates/NON_EXISTENT_CODE/schema")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("TPL_NOT_FOUND"));
    }

    @Test
    void getTemplateSchema_hardcodedTemplate_returns404() throws Exception {
        // GENERAL is a hardcoded template with null schemaDefinition
        mockMvc.perform(get("/api/v1/templates/GENERAL/schema")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("TPL_NOT_FOUND"));
    }
}
