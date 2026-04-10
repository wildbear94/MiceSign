package com.micesign.budget;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BudgetDataExtractorTest {

    private BudgetDataExtractor extractor;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        extractor = new BudgetDataExtractor(objectMapper);
    }

    @Test
    void extractExpense_shouldMapTotalAmountAndItems() throws Exception {
        String formData = objectMapper.writeValueAsString(Map.of(
                "items", List.of(Map.of("name", "item1", "amount", 50000)),
                "totalAmount", 50000
        ));

        BudgetExpenseRequest request = extractor.extract(
                "EXPENSE", formData, "EXP-2026-0001", "E001",
                "Test User", "Engineering", LocalDateTime.now());

        assertThat(request.getTotalAmount()).isEqualTo(50000L);
        assertThat(request.getDetails()).containsKey("items");
        assertThat(request.getDetails().get("items")).isNotNull();
        assertThat(request.getDocumentNumber()).isEqualTo("EXP-2026-0001");
        assertThat(request.getTemplateCode()).isEqualTo("EXPENSE");
        assertThat(request.getDrafterEmployeeNo()).isEqualTo("E001");
        assertThat(request.getDrafterName()).isEqualTo("Test User");
        assertThat(request.getDepartmentName()).isEqualTo("Engineering");
    }

    @Test
    void extractPurchase_shouldMapSupplierAndDeliveryDate() throws Exception {
        String formData = objectMapper.writeValueAsString(Map.of(
                "items", List.of(Map.of("name", "laptop", "amount", 2000000)),
                "totalAmount", 2000000,
                "supplier", "Samsung",
                "deliveryDate", "2026-05-01"
        ));

        BudgetExpenseRequest request = extractor.extract(
                "PURCHASE", formData, "PUR-2026-0001", "E002",
                "Purchase User", "Procurement", LocalDateTime.now());

        assertThat(request.getTotalAmount()).isEqualTo(2000000L);
        assertThat(request.getDetails()).containsKey("items");
        assertThat(request.getDetails().get("supplier")).isEqualTo("Samsung");
        assertThat(request.getDetails().get("deliveryDate")).isEqualTo("2026-05-01");
    }

    @Test
    void extractBusinessTrip_shouldMapTotalExpenseAndDestination() throws Exception {
        String formData = objectMapper.writeValueAsString(Map.of(
                "expenses", List.of(Map.of("type", "transport", "amount", 100000)),
                "totalExpense", 300000,
                "destination", "Busan",
                "startDate", "2026-04-10",
                "endDate", "2026-04-12"
        ));

        BudgetExpenseRequest request = extractor.extract(
                "BUSINESS_TRIP", formData, "BT-2026-0001", "E003",
                "Trip User", "Sales", LocalDateTime.now());

        assertThat(request.getTotalAmount()).isEqualTo(300000L);
        assertThat(request.getDetails().get("destination")).isEqualTo("Busan");
        assertThat(request.getDetails().get("startDate")).isEqualTo("2026-04-10");
        assertThat(request.getDetails().get("endDate")).isEqualTo("2026-04-12");
        assertThat(request.getDetails()).containsKey("expenses");
    }

    @Test
    void extractOvertime_shouldSetTotalAmountToNull() throws Exception {
        String formData = objectMapper.writeValueAsString(Map.of(
                "workDate", "2026-04-07",
                "startTime", "18:00",
                "endTime", "21:00",
                "hours", 3.0,
                "reason", "test"
        ));

        BudgetExpenseRequest request = extractor.extract(
                "OVERTIME", formData, "OT-2026-0001", "E004",
                "OT User", "Dev", LocalDateTime.now());

        assertThat(request.getTotalAmount()).isNull();
        assertThat(request.getDetails().get("hours")).isEqualTo(3.0);
        assertThat(request.getDetails().get("workDate")).isEqualTo("2026-04-07");
        assertThat(request.getDetails().get("startTime")).isEqualTo("18:00");
        assertThat(request.getDetails().get("endTime")).isEqualTo("21:00");
    }

    @Test
    void unknownTemplate_shouldReturnZeroAmountAndEmptyDetails() throws Exception {
        String formData = objectMapper.writeValueAsString(Map.of("someField", "value"));

        BudgetExpenseRequest request = extractor.extract(
                "UNKNOWN", formData, "UNK-2026-0001", "E005",
                "Unknown User", "Dept", LocalDateTime.now());

        assertThat(request.getTotalAmount()).isEqualTo(0L);
        assertThat(request.getDetails()).isEmpty();
    }
}
