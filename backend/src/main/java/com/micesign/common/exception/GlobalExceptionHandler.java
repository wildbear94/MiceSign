package com.micesign.common.exception;

import com.micesign.common.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<?>> handleBusiness(BusinessException ex) {
        log.warn("BusinessException [{}]: {}", ex.getCode(), ex.getMessage(), ex);
        return ResponseEntity.status(ex.getHttpStatus()).body(ApiResponse.error(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", message));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<?>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = String.format("파라미터 '%s' 의 값이 올바르지 않습니다: %s",
            ex.getName(), ex.getValue());
        log.warn("TypeMismatch on '{}' = '{}' (required type: {})",
            ex.getName(), ex.getValue(),
            ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "?");
        return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", message));
    }

    @ExceptionHandler(FormValidationException.class)
    public ResponseEntity<ApiResponse<?>> handleFormValidation(FormValidationException ex) {
        log.warn("FormValidationException: {}", ex.getFieldErrors());
        return ResponseEntity.badRequest().body(
            new ApiResponse<>(false, Map.of("fieldErrors", ex.getFieldErrors()),
                new ApiResponse.ErrorDetail("FORM_VALIDATION_ERROR", "양식 검증에 실패했습니다."))
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        log.error("Unhandled exception: {} - {}", ex.getClass().getName(), ex.getMessage(), ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error("SYS_001", "서버 내부 오류가 발생했습니다."));
    }
}
