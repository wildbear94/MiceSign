package com.micesign.template;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DynamicFormValidationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;

    @MockitoBean GoogleDriveService googleDriveService;

    private String adminToken;
    private String templateCode;

    @BeforeEach
    void setUp() throws Exception {
        // Clean up
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
        jdbcTemplate.update("DELETE FROM template_schema_version WHERE template_id IN (SELECT id FROM approval_template WHERE is_custom = TRUE)");
        jdbcTemplate.update("DELETE FROM approval_template WHERE is_custom = TRUE");

        adminToken = tokenHelper.superAdminToken();

        // Create a custom template with all 8 field types
        SchemaDefinition schema = allFieldTypesSchema();
        CreateTemplateRequest createReq = new CreateTemplateRequest(
                "검증 테스트 양식", "VLD", "검증 테스트", "일반", "document", schema);

        MvcResult result = mockMvc.perform(post("/api/v1/admin/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn();

        templateCode = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("code").asText();
    }

    private SchemaDefinition allFieldTypesSchema() {
        // text field with maxLength
        FieldConfig textConfig = new FieldConfig("입력하세요", 50, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition textField = new FieldDefinition("f_title", "text", "제목", true, textConfig);

        // textarea field
        FieldConfig textareaConfig = new FieldConfig(null, 500, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition textareaField = new FieldDefinition("f_content", "textarea", "내용", false, textareaConfig);

        // number field with min/max
        FieldConfig numberConfig = new FieldConfig(null, null, 0L, 1000000L, "원", null, null, null, null, null, null, null);
        FieldDefinition numberField = new FieldDefinition("f_amount", "number", "금액", true, numberConfig);

        // date field
        FieldDefinition dateField = new FieldDefinition("f_date", "date", "날짜", true, null);

        // select field
        FieldConfig selectConfig = new FieldConfig(null, null, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition selectField = new FieldDefinition("f_category", "select", "분류", false, selectConfig);

        // table field with columns and min/max rows
        FieldConfig colNameConfig = new FieldConfig(null, 100, null, null, null, null, null, null, null, null, null, null);
        FieldDefinition colName = new FieldDefinition("col_name", "text", "항목명", true, colNameConfig);
        FieldConfig colAmountConfig = new FieldConfig(null, null, 1L, 999999L, null, null, null, null, null, null, null, null);
        FieldDefinition colAmount = new FieldDefinition("col_amount", "number", "금액", true, colAmountConfig);
        FieldConfig tableConfig = new FieldConfig(null, null, null, null, null, null, null, 1, 5, List.of(colName, colAmount), null, null);
        FieldDefinition tableField = new FieldDefinition("f_items", "table", "항목", false, tableConfig);

        // staticText field
        FieldConfig staticConfig = new FieldConfig(null, null, null, null, null, null, null, null, null, null, "이 양식은 테스트용입니다.", null);
        FieldDefinition staticField = new FieldDefinition("f_notice", "staticText", "안내", false, staticConfig);

        // hidden field
        FieldConfig hiddenConfig = new FieldConfig(null, null, null, null, null, null, null, null, null, null, null, "auto_value");
        FieldDefinition hiddenField = new FieldDefinition("f_hidden", "hidden", "숨겨진 필드", false, hiddenConfig);

        return new SchemaDefinition(1, List.of(textField, textareaField, numberField, dateField, selectField, tableField, staticField, hiddenField), List.of(), List.of());
    }

    private String createDocJson(ObjectNode formData) throws Exception {
        CreateDocumentRequest req = new CreateDocumentRequest(
                templateCode, "테스트 문서", "<p>본문</p>",
                objectMapper.writeValueAsString(formData), null);
        return objectMapper.writeValueAsString(req);
    }

    private ObjectNode validFormData() {
        ObjectNode data = objectMapper.createObjectNode();
        data.put("f_title", "테스트 제목");
        data.put("f_amount", 50000);
        data.put("f_date", "2026-04-05");
        // table with one row
        ArrayNode rows = objectMapper.createArrayNode();
        ObjectNode row = objectMapper.createObjectNode();
        row.put("col_name", "항목1");
        row.put("col_amount", 10000);
        rows.add(row);
        data.set("f_items", rows);
        return data;
    }

    @Test
    void text필드_필수값_누락시_에러반환() throws Exception {
        ObjectNode data = validFormData();
        data.remove("f_title"); // required text field missing

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("FORM_VALIDATION_ERROR"))
                .andExpect(jsonPath("$.data.fieldErrors.f_title").isArray())
                .andExpect(jsonPath("$.data.fieldErrors.f_title[0]", containsString("필수")));
    }

    @Test
    void text필드_maxLength_초과시_에러반환() throws Exception {
        ObjectNode data = validFormData();
        data.put("f_title", "a".repeat(51)); // maxLength is 50

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.fieldErrors.f_title[0]", containsString("50")));
    }

    @Test
    void number필드_min_미만시_에러반환() throws Exception {
        ObjectNode data = validFormData();
        data.put("f_amount", -1); // min is 0

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.fieldErrors.f_amount[0]", containsString("최소")));
    }

    @Test
    void number필드_max_초과시_에러반환() throws Exception {
        ObjectNode data = validFormData();
        data.put("f_amount", 1000001); // max is 1000000

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.fieldErrors.f_amount[0]", containsString("최대")));
    }

    @Test
    void number필드_문자열시_에러반환() throws Exception {
        ObjectNode data = validFormData();
        data.put("f_amount", "not-a-number");

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.fieldErrors.f_amount[0]", containsString("숫자")));
    }

    @Test
    void date필드_잘못된형식시_에러반환() throws Exception {
        ObjectNode data = validFormData();
        data.put("f_date", "2026/04/05"); // not ISO-8601

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.fieldErrors.f_date[0]", containsString("yyyy-MM-dd")));
    }

    @Test
    void select필드_정상값_통과() throws Exception {
        ObjectNode data = validFormData();
        data.put("f_category", "일반");

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isCreated());
    }

    @Test
    void table필드_minRows_미만시_에러반환() throws Exception {
        ObjectNode data = validFormData();
        data.set("f_items", objectMapper.createArrayNode()); // empty array, minRows is 1

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.fieldErrors.f_items[0]", containsString("최소")));
    }

    @Test
    void table필드_maxRows_초과시_에러반환() throws Exception {
        ObjectNode data = validFormData();
        ArrayNode rows = objectMapper.createArrayNode();
        for (int i = 0; i < 6; i++) { // maxRows is 5
            ObjectNode row = objectMapper.createObjectNode();
            row.put("col_name", "항목" + i);
            row.put("col_amount", 1000);
            rows.add(row);
        }
        data.set("f_items", rows);

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.fieldErrors.f_items[0]", containsString("최대")));
    }

    @Test
    void table필드_셀검증_실패시_에러반환() throws Exception {
        ObjectNode data = validFormData();
        ArrayNode rows = objectMapper.createArrayNode();
        ObjectNode row = objectMapper.createObjectNode();
        row.putNull("col_name"); // required column
        row.put("col_amount", 1000);
        rows.add(row);
        data.set("f_items", rows);

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.fieldErrors['f_items.rows[0].col_name']").isArray());
    }

    @Test
    void staticText_hidden_검증스킵() throws Exception {
        // staticText and hidden fields should not cause validation errors even without values
        ObjectNode data = validFormData();
        // Don't provide f_notice or f_hidden — they should be skipped
        data.remove("f_notice");
        data.remove("f_hidden");

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isCreated());
    }

    @Test
    void 모든필드_정상값_통과() throws Exception {
        ObjectNode data = validFormData();
        data.put("f_content", "상세 내용입니다.");
        data.put("f_category", "업무");

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDocJson(data)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").isNumber());
    }

    @Test
    void 기존하드코딩양식_검증_정상작동() throws Exception {
        // Use GENERAL template (hardcoded) — should still work via FormValidationStrategy
        CreateDocumentRequest req = new CreateDocumentRequest(
                "GENERAL", "일반 문서", "<p>일반 본문</p>", null, null);

        mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }
}
