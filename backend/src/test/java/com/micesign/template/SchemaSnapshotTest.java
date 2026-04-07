package com.micesign.template;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.micesign.admin.TestTokenHelper;
import com.micesign.dto.document.CreateDocumentRequest;
import com.micesign.dto.template.*;
import com.micesign.service.GoogleDriveService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SchemaSnapshotTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;

    @MockitoBean GoogleDriveService googleDriveService;

    private String adminToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
        jdbcTemplate.update("DELETE FROM template_schema_version WHERE template_id IN (SELECT id FROM approval_template WHERE is_custom = TRUE)");
        jdbcTemplate.update("DELETE FROM approval_template WHERE is_custom = TRUE");
        jdbcTemplate.update("DELETE FROM option_item");
        jdbcTemplate.update("DELETE FROM option_set");

        adminToken = tokenHelper.superAdminToken();
    }

    @Test
    void 동적템플릿_문서생성시_스냅샷저장() throws Exception {
        // 1. Create option set
        String optSetJson = """
            {"name": "부서목록", "description": "부서 선택용", "items": [
                {"value": "dev", "label": "개발팀", "sortOrder": 1},
                {"value": "sales", "label": "영업팀", "sortOrder": 2}
            ]}
            """;
        MvcResult optResult = mockMvc.perform(post("/api/v1/admin/option-sets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(optSetJson))
                .andExpect(status().isCreated())
                .andReturn();
        Long optionSetId = objectMapper.readTree(optResult.getResponse().getContentAsString())
                .get("data").get("id").asLong();

        // 2. Create custom template with select field referencing option set
        FieldConfig selectConfig = new FieldConfig(null, null, null, null, null, optionSetId, null, null, null, null, null, null);
        FieldDefinition selectField = new FieldDefinition("f_dept", "select", "부서", false, selectConfig);
        FieldConfig textConfig = new FieldConfig(null, 200, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition textField = new FieldDefinition("f_title", "text", "제목", true, textConfig);
        SchemaDefinition schema = new SchemaDefinition(1, List.of(textField, selectField), List.of(), List.of());

        CreateTemplateRequest tmplReq = new CreateTemplateRequest(
                "스냅샷 테스트", "SNP", "스냅샷 테스트용", null, null, schema);
        MvcResult tmplResult = mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tmplReq)))
                .andExpect(status().isCreated())
                .andReturn();
        String templateCode = objectMapper.readTree(tmplResult.getResponse().getContentAsString())
                .get("data").get("code").asText();

        // 3. Create document with dynamic template
        ObjectNode formData = objectMapper.createObjectNode();
        formData.put("f_title", "스냅샷 테스트 문서");
        formData.put("f_dept", "dev");
        CreateDocumentRequest docReq = new CreateDocumentRequest(
                templateCode, "스냅샷 테스트", "<p>본문</p>",
                objectMapper.writeValueAsString(formData), null);

        MvcResult docResult = mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(docReq)))
                .andExpect(status().isCreated())
                .andReturn();
        Long docId = objectMapper.readTree(docResult.getResponse().getContentAsString())
                .get("data").get("id").asLong();

        // 4. Verify snapshot saved
        String snapshot = jdbcTemplate.queryForObject(
                "SELECT schema_definition_snapshot FROM document_content WHERE document_id = ?",
                String.class, docId);
        assertThat(snapshot).isNotNull();

        Integer schemaVer = jdbcTemplate.queryForObject(
                "SELECT schema_version FROM document_content WHERE document_id = ?",
                Integer.class, docId);
        assertThat(schemaVer).isEqualTo(1);

        // 5. Verify snapshot contains resolved options
        JsonNode snapshotNode = objectMapper.readTree(snapshot);
        JsonNode fields = snapshotNode.get("fields");
        boolean foundResolvedOptions = false;
        for (JsonNode field : fields) {
            if ("f_dept".equals(field.get("id").asText())) {
                JsonNode config = field.get("config");
                assertThat(config.has("options")).isTrue();
                assertThat(config.get("options").size()).isEqualTo(2);
                assertThat(config.get("options").get(0).get("value").asText()).isEqualTo("dev");
                foundResolvedOptions = true;
            }
        }
        assertThat(foundResolvedOptions).isTrue();
    }

    @Test
    void 하드코딩양식_문서생성시_스냅샷_NULL() throws Exception {
        // Create document with GENERAL template (hardcoded, no schema)
        CreateDocumentRequest docReq = new CreateDocumentRequest(
                "GENERAL", "일반 문서", "<p>본문</p>", null, null);

        MvcResult docResult = mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(docReq)))
                .andExpect(status().isCreated())
                .andReturn();
        Long docId = objectMapper.readTree(docResult.getResponse().getContentAsString())
                .get("data").get("id").asLong();

        // Verify no snapshot
        String snapshot = jdbcTemplate.queryForObject(
                "SELECT schema_definition_snapshot FROM document_content WHERE document_id = ?",
                String.class, docId);
        assertThat(snapshot).isNull();

        Integer schemaVer = jdbcTemplate.queryForObject(
                "SELECT schema_version FROM document_content WHERE document_id = ?",
                Integer.class, docId);
        assertThat(schemaVer).isNull();
    }

    @Test
    void 스키마수정후_기존문서_스냅샷유지() throws Exception {
        // 1. Create custom template (version 1)
        FieldConfig textConfig = new FieldConfig(null, 200, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition textField = new FieldDefinition("f_title", "text", "제목", true, textConfig);
        SchemaDefinition schemaV1 = new SchemaDefinition(1, List.of(textField), List.of(), List.of());

        CreateTemplateRequest tmplReq = new CreateTemplateRequest(
                "버전 테스트", "VER", "버전 테스트용", null, null, schemaV1);
        MvcResult tmplResult = mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tmplReq)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode tmplData = objectMapper.readTree(tmplResult.getResponse().getContentAsString()).get("data");
        String templateCode = tmplData.get("code").asText();
        Long templateId = tmplData.get("id").asLong();

        // 2. Create document (snapshot = version 1)
        ObjectNode formData = objectMapper.createObjectNode();
        formData.put("f_title", "버전1 문서");
        CreateDocumentRequest docReq = new CreateDocumentRequest(
                templateCode, "버전1", "<p>본문</p>",
                objectMapper.writeValueAsString(formData), null);

        MvcResult docResult = mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(docReq)))
                .andExpect(status().isCreated())
                .andReturn();
        Long docId = objectMapper.readTree(docResult.getResponse().getContentAsString())
                .get("data").get("id").asLong();

        // Record original snapshot
        String originalSnapshot = jdbcTemplate.queryForObject(
                "SELECT schema_definition_snapshot FROM document_content WHERE document_id = ?",
                String.class, docId);
        Integer originalVersion = jdbcTemplate.queryForObject(
                "SELECT schema_version FROM document_content WHERE document_id = ?",
                Integer.class, docId);
        assertThat(originalVersion).isEqualTo(1);

        // 3. Update template schema (version 2) — add a new field
        FieldConfig textConfig2 = new FieldConfig(null, 500, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition newField = new FieldDefinition("f_content", "textarea", "내용", false, textConfig2);
        SchemaDefinition schemaV2 = new SchemaDefinition(2, List.of(textField, newField), List.of(), List.of());

        UpdateTemplateRequest updateReq = new UpdateTemplateRequest(
                null, null, null, null, schemaV2);
        mockMvc.perform(put("/api/v1/admin/templates/" + templateId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.schemaVersion").value(2));

        // 4. Verify original document still has version 1 snapshot
        String afterSnapshot = jdbcTemplate.queryForObject(
                "SELECT schema_definition_snapshot FROM document_content WHERE document_id = ?",
                String.class, docId);
        Integer afterVersion = jdbcTemplate.queryForObject(
                "SELECT schema_version FROM document_content WHERE document_id = ?",
                Integer.class, docId);

        assertThat(afterVersion).isEqualTo(1);
        assertThat(afterSnapshot).isEqualTo(originalSnapshot);

        // Verify snapshot only has 1 field (version 1 schema)
        JsonNode snapshotNode = objectMapper.readTree(afterSnapshot);
        assertThat(snapshotNode.get("fields").size()).isEqualTo(1);
    }
}
