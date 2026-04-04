package com.micesign.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import com.micesign.service.DocumentFormValidator;
import com.micesign.service.validation.ExpenseFormValidator;
import com.micesign.service.validation.GeneralFormValidator;
import com.micesign.service.validation.LeaveFormValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class DocumentFormValidatorTest {

    private DocumentFormValidator validator;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        validator = new DocumentFormValidator(List.of(
            new GeneralFormValidator(),
            new ExpenseFormValidator(objectMapper),
            new LeaveFormValidator(objectMapper)
        ));
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

    // --- UNKNOWN TEMPLATE ---

    @Test
    void validateUnknownTemplate_throwsException() {
        assertThatThrownBy(() -> validator.validate("UNKNOWN", null, null))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "TPL_UNKNOWN");
    }
}
