package com.micesign.template;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.repository.ApprovalTemplateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TemplateSchemaTest {

    @Autowired
    private ApprovalTemplateRepository templateRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // --- Helper methods ---

    private JsonNode parseSchema(String schemaJson) throws Exception {
        return objectMapper.readTree(schemaJson);
    }

    private void assertField(JsonNode fields, int index, String expectedId, String expectedType, String expectedLabel) {
        JsonNode field = fields.get(index);
        assertNotNull(field, "Field at index " + index + " should exist");
        assertEquals(expectedId, field.get("id").asText(), "Field id mismatch at index " + index);
        assertEquals(expectedType, field.get("type").asText(), "Field type mismatch at index " + index);
        assertEquals(expectedLabel, field.get("label").asText(), "Field label mismatch at index " + index);
    }

    // --- GENERAL ---

    @Test
    void testGeneralSchemaStructure() throws Exception {
        ApprovalTemplate template = templateRepository.findByCode("GENERAL")
                .orElseThrow(() -> new AssertionError("GENERAL template not found"));

        assertNotNull(template.getSchemaDefinition(), "GENERAL schema_definition should not be null");

        JsonNode schema = parseSchema(template.getSchemaDefinition());
        JsonNode fields = schema.get("fields");
        assertNotNull(fields, "fields array should exist");
        assertEquals(2, fields.size(), "GENERAL should have 2 fields");

        assertField(fields, 0, "title", "text", "제목");
        assertField(fields, 1, "bodyText", "textarea", "내용");
    }

    // --- EXPENSE ---

    @Test
    void testExpenseSchemaStructure() throws Exception {
        ApprovalTemplate template = templateRepository.findByCode("EXPENSE")
                .orElseThrow(() -> new AssertionError("EXPENSE template not found"));

        assertNotNull(template.getSchemaDefinition(), "EXPENSE schema_definition should not be null");

        JsonNode schema = parseSchema(template.getSchemaDefinition());
        JsonNode fields = schema.get("fields");
        assertNotNull(fields, "fields array should exist");
        assertEquals(4, fields.size(), "EXPENSE should have 4 fields");

        assertField(fields, 0, "items", "table", "지출 항목");
        assertField(fields, 1, "totalAmount", "number", "총액");
        assertField(fields, 2, "paymentMethod", "text", "결제 수단");
        assertField(fields, 3, "accountInfo", "text", "계좌/카드 정보");
    }

    // --- LEAVE ---

    @Test
    void testLeaveSchemaStructure() throws Exception {
        ApprovalTemplate template = templateRepository.findByCode("LEAVE")
                .orElseThrow(() -> new AssertionError("LEAVE template not found"));

        assertNotNull(template.getSchemaDefinition(), "LEAVE schema_definition should not be null");

        JsonNode schema = parseSchema(template.getSchemaDefinition());
        JsonNode fields = schema.get("fields");
        assertNotNull(fields, "fields array should exist");
        assertEquals(8, fields.size(), "LEAVE should have 8 fields");

        assertField(fields, 0, "leaveType", "select", "휴가 유형");
        assertField(fields, 1, "startDate", "date", "시작일");
        assertField(fields, 2, "endDate", "date", "종료일");
        assertField(fields, 3, "startTime", "text", "시작 시간");
        assertField(fields, 4, "endTime", "text", "종료 시간");
        assertField(fields, 5, "days", "number", "사용일수");
        assertField(fields, 6, "reason", "textarea", "사유");
        assertField(fields, 7, "emergencyContact", "text", "비상 연락처");
    }

    // --- PURCHASE ---

    @Test
    void testPurchaseSchemaStructure() throws Exception {
        ApprovalTemplate template = templateRepository.findByCode("PURCHASE")
                .orElseThrow(() -> new AssertionError("PURCHASE template not found"));

        assertNotNull(template.getSchemaDefinition(), "PURCHASE schema_definition should not be null");

        JsonNode schema = parseSchema(template.getSchemaDefinition());
        JsonNode fields = schema.get("fields");
        assertNotNull(fields, "fields array should exist");
        assertEquals(5, fields.size(), "PURCHASE should have 5 fields");

        assertField(fields, 0, "purpose", "textarea", "구매 목적");
        assertField(fields, 1, "items", "table", "구매 항목");
        assertField(fields, 2, "totalAmount", "number", "총액");
        assertField(fields, 3, "deliveryDate", "date", "납품 희망일");
        assertField(fields, 4, "supplier", "text", "공급업체");
    }

    // --- BUSINESS_TRIP ---

    @Test
    void testBusinessTripSchemaStructure() throws Exception {
        ApprovalTemplate template = templateRepository.findByCode("BUSINESS_TRIP")
                .orElseThrow(() -> new AssertionError("BUSINESS_TRIP template not found"));

        assertNotNull(template.getSchemaDefinition(), "BUSINESS_TRIP schema_definition should not be null");

        JsonNode schema = parseSchema(template.getSchemaDefinition());
        JsonNode fields = schema.get("fields");
        assertNotNull(fields, "fields array should exist");
        assertEquals(8, fields.size(), "BUSINESS_TRIP should have 8 fields");

        assertField(fields, 0, "destination", "text", "출장지");
        assertField(fields, 1, "startDate", "date", "시작일");
        assertField(fields, 2, "endDate", "date", "종료일");
        assertField(fields, 3, "purpose", "textarea", "출장 목적");
        assertField(fields, 4, "itinerary", "table", "일정");
        assertField(fields, 5, "expenses", "table", "경비");
        assertField(fields, 6, "totalExpense", "number", "총 경비");
        assertField(fields, 7, "report", "textarea", "출장 결과");
    }

    // --- OVERTIME ---

    @Test
    void testOvertimeSchemaStructure() throws Exception {
        ApprovalTemplate template = templateRepository.findByCode("OVERTIME")
                .orElseThrow(() -> new AssertionError("OVERTIME template not found"));

        assertNotNull(template.getSchemaDefinition(), "OVERTIME schema_definition should not be null");

        JsonNode schema = parseSchema(template.getSchemaDefinition());
        JsonNode fields = schema.get("fields");
        assertNotNull(fields, "fields array should exist");
        assertEquals(6, fields.size(), "OVERTIME should have 6 fields");

        assertField(fields, 0, "workDate", "date", "근무일");
        assertField(fields, 1, "startTime", "text", "시작 시간");
        assertField(fields, 2, "endTime", "text", "종료 시간");
        assertField(fields, 3, "hours", "number", "근무 시간");
        assertField(fields, 4, "reason", "textarea", "사유");
        assertField(fields, 5, "managerName", "text", "담당 관리자");
    }
}
