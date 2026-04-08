package com.micesign.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import com.micesign.service.DocumentFormValidator;
import com.micesign.service.validation.BusinessTripFormValidator;
import com.micesign.service.validation.DynamicFormValidator;
import com.micesign.service.validation.ExpenseFormValidator;
import com.micesign.service.validation.GeneralFormValidator;
import com.micesign.service.validation.LeaveFormValidator;
import com.micesign.service.validation.OvertimeFormValidator;
import com.micesign.service.validation.PurchaseFormValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;

class DocumentFormValidatorTest {

    private DocumentFormValidator validator;
    private DynamicFormValidator dynamicFormValidator;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        dynamicFormValidator = Mockito.mock(DynamicFormValidator.class);
        validator = new DocumentFormValidator(List.of(
            new GeneralFormValidator(),
            new ExpenseFormValidator(objectMapper),
            new LeaveFormValidator(objectMapper),
            new PurchaseFormValidator(objectMapper),
            new BusinessTripFormValidator(objectMapper),
            new OvertimeFormValidator(objectMapper)
        ), dynamicFormValidator);
    }

    // --- GENERAL ---

    @Test
    void validateGeneral_valid_noException() {
        assertDoesNotThrow(() ->
            validator.validate("GENERAL", "<p>본문 내용입니다.</p>", null));
    }

    @Test
    void validateGeneral_emptyBody_throwsException() {
        assertThatThrownBy(() -> validator.validate("GENERAL", "", null))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateGeneral_nullBody_throwsException() {
        assertThatThrownBy(() -> validator.validate("GENERAL", null, null))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    // --- EXPENSE ---

    @Test
    void validateExpense_valid_noException() {
        String formData = """
            {"items":[{"name":"택시비","quantity":1,"unitPrice":15000,"amount":15000}],"totalAmount":15000}
            """;
        assertDoesNotThrow(() ->
            validator.validate("EXPENSE", null, formData));
    }

    @Test
    void validateExpense_missingItems_throwsException() {
        String formData = """
            {"totalAmount":0}
            """;
        assertThatThrownBy(() -> validator.validate("EXPENSE", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateExpense_emptyItems_throwsException() {
        String formData = """
            {"items":[],"totalAmount":0}
            """;
        assertThatThrownBy(() -> validator.validate("EXPENSE", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateExpense_nullFormData_throwsException() {
        assertThatThrownBy(() -> validator.validate("EXPENSE", null, null))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateExpense_invalidJson_throwsException() {
        assertThatThrownBy(() -> validator.validate("EXPENSE", null, "not json"))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateExpense_missingItemName_throwsException() {
        String formData = """
            {"items":[{"quantity":1,"unitPrice":15000,"amount":15000}],"totalAmount":15000}
            """;
        assertThatThrownBy(() -> validator.validate("EXPENSE", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateExpense_negativeAmount_throwsException() {
        String formData = """
            {"items":[{"name":"택시비","quantity":1,"unitPrice":15000,"amount":-1}],"totalAmount":15000}
            """;
        assertThatThrownBy(() -> validator.validate("EXPENSE", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    // --- LEAVE ---

    @Test
    void validateLeave_valid_noException() {
        String formData = """
            {"leaveTypeId":1,"startDate":"2026-04-05","endDate":"2026-04-07","days":3,"reason":"개인 사유"}
            """;
        assertDoesNotThrow(() ->
            validator.validate("LEAVE", null, formData));
    }

    @Test
    void validateLeave_missingStartDate_throwsException() {
        String formData = """
            {"leaveTypeId":1,"days":1,"reason":"test"}
            """;
        assertThatThrownBy(() -> validator.validate("LEAVE", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateLeave_missingReason_throwsException() {
        String formData = """
            {"leaveTypeId":1,"startDate":"2026-04-05","days":1}
            """;
        assertThatThrownBy(() -> validator.validate("LEAVE", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateLeave_missingDays_throwsException() {
        String formData = """
            {"leaveTypeId":1,"startDate":"2026-04-05","reason":"test"}
            """;
        assertThatThrownBy(() -> validator.validate("LEAVE", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateLeave_nullFormData_throwsException() {
        assertThatThrownBy(() -> validator.validate("LEAVE", null, null))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    // --- PURCHASE ---

    @Test
    void validatePurchase_valid_noException() {
        String formData = """
            {
              "supplier":"(주)테스트컴퍼니",
              "deliveryDate":"2026-04-15",
              "purchaseReason":"업무용 장비 교체",
              "items":[{"name":"모니터","spec":"27인치 4K","quantity":2,"unitPrice":350000,"amount":700000}],
              "totalAmount":700000
            }
            """;
        assertDoesNotThrow(() ->
            validator.validate("PURCHASE", null, formData));
    }

    @Test
    void validatePurchase_missingSupplier_throwsException() {
        String formData = """
            {
              "deliveryDate":"2026-04-15",
              "purchaseReason":"업무용",
              "items":[{"name":"모니터","quantity":1,"unitPrice":350000,"amount":350000}],
              "totalAmount":350000
            }
            """;
        assertThatThrownBy(() -> validator.validate("PURCHASE", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validatePurchase_emptyItems_throwsException() {
        String formData = """
            {
              "supplier":"(주)테스트",
              "deliveryDate":"2026-04-15",
              "purchaseReason":"업무용",
              "items":[],
              "totalAmount":0
            }
            """;
        assertThatThrownBy(() -> validator.validate("PURCHASE", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validatePurchase_nullFormData_throwsException() {
        assertThatThrownBy(() -> validator.validate("PURCHASE", null, null))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    // --- BUSINESS_TRIP ---

    @Test
    void validateBusinessTrip_valid_noException() {
        String formData = """
            {
              "destination":"부산 해운대",
              "startDate":"2026-04-10",
              "endDate":"2026-04-12",
              "purpose":"거래처 미팅",
              "itinerary":[{"date":"2026-04-10","location":"부산역"},{"date":"2026-04-11","location":"해운대 사무소"}],
              "expenses":[{"category":"교통비","amount":60000},{"category":"숙박비","amount":120000}],
              "totalExpense":180000
            }
            """;
        assertDoesNotThrow(() ->
            validator.validate("BUSINESS_TRIP", null, formData));
    }

    @Test
    void validateBusinessTrip_missingDestination_throwsException() {
        String formData = """
            {
              "startDate":"2026-04-10",
              "endDate":"2026-04-12",
              "purpose":"거래처 미팅",
              "itinerary":[{"date":"2026-04-10","location":"부산역"}]
            }
            """;
        assertThatThrownBy(() -> validator.validate("BUSINESS_TRIP", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateBusinessTrip_emptyItinerary_throwsException() {
        String formData = """
            {
              "destination":"부산",
              "startDate":"2026-04-10",
              "endDate":"2026-04-12",
              "purpose":"거래처 미팅",
              "itinerary":[]
            }
            """;
        assertThatThrownBy(() -> validator.validate("BUSINESS_TRIP", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateBusinessTrip_nullFormData_throwsException() {
        assertThatThrownBy(() -> validator.validate("BUSINESS_TRIP", null, null))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    // --- OVERTIME ---

    @Test
    void validateOvertime_valid_noException() {
        String formData = """
            {
              "workDate":"2026-04-05",
              "startTime":"18:00",
              "endTime":"21:00",
              "hours":3,
              "reason":"프로젝트 마감 대응"
            }
            """;
        assertDoesNotThrow(() ->
            validator.validate("OVERTIME", null, formData));
    }

    @Test
    void validateOvertime_missingWorkDate_throwsException() {
        String formData = """
            {
              "startTime":"18:00",
              "endTime":"21:00",
              "hours":3,
              "reason":"프로젝트 마감 대응"
            }
            """;
        assertThatThrownBy(() -> validator.validate("OVERTIME", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateOvertime_zeroHours_throwsException() {
        String formData = """
            {
              "workDate":"2026-04-05",
              "startTime":"18:00",
              "endTime":"18:00",
              "hours":0,
              "reason":"프로젝트 마감 대응"
            }
            """;
        assertThatThrownBy(() -> validator.validate("OVERTIME", null, formData))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    @Test
    void validateOvertime_nullFormData_throwsException() {
        assertThatThrownBy(() -> validator.validate("OVERTIME", null, null))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "DOC_INVALID_FORM_DATA");
    }

    // --- UNKNOWN TEMPLATE (falls back to DynamicFormValidator) ---

    @Test
    void validateUnknownTemplate_delegatesToDynamicValidator() {
        doThrow(new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다."))
            .when(dynamicFormValidator).validate(anyString(), anyString());

        assertThatThrownBy(() -> validator.validate("UNKNOWN", null, "{}"))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "TPL_NOT_FOUND");
    }
}
