package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.template.*;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.TemplateService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin template management endpoints.
 */
@RestController
@RequestMapping("/api/v1/admin/templates")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminTemplateController {

    private final TemplateService templateService;

    public AdminTemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TemplateResponse>>> listAllTemplates() {
        List<TemplateResponse> templates = templateService.getAllTemplates();
        return ResponseEntity.ok(ApiResponse.ok(templates));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TemplateDetailResponse>> getTemplate(
            @PathVariable Long id) {
        TemplateDetailResponse detail = templateService.getTemplateDetail(id);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TemplateDetailResponse>> createTemplate(
            @Valid @RequestBody CreateTemplateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        TemplateDetailResponse response = templateService.createTemplate(user.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TemplateDetailResponse>> updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTemplateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        TemplateDetailResponse response = templateService.updateTemplate(id, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateTemplate(@PathVariable Long id) {
        templateService.deactivateTemplate(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
