package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.template.CreateTemplateRequest;
import com.micesign.dto.template.TemplateDetailResponse;
import com.micesign.dto.template.TemplateResponse;
import com.micesign.dto.template.UpdateTemplateRequest;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.TemplateService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    /**
     * 활성 템플릿 목록 조회 (인증된 사용자 전체)
     */
    @GetMapping("/templates")
    public ApiResponse<List<TemplateResponse>> getActiveTemplates() {
        return ApiResponse.ok(templateService.getActiveTemplates());
    }

    /**
     * Admin: 전체 템플릿 목록 조회
     */
    @GetMapping("/admin/templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ApiResponse<List<TemplateResponse>> getAllTemplates() {
        return ApiResponse.ok(templateService.getAllTemplates());
    }

    /**
     * Admin: 템플릿 상세 조회
     */
    @GetMapping("/admin/templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ApiResponse<TemplateDetailResponse> getTemplateDetail(@PathVariable Long id) {
        return ApiResponse.ok(templateService.getTemplateDetail(id));
    }

    /**
     * Admin: 커스텀 템플릿 생성
     */
    @PostMapping("/admin/templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<TemplateDetailResponse>> createTemplate(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody CreateTemplateRequest request) {
        TemplateDetailResponse response = templateService.createTemplate(user.getUserId(), request);
        return ResponseEntity.status(201).body(ApiResponse.ok(response));
    }

    /**
     * Admin: 커스텀 템플릿 수정
     */
    @PutMapping("/admin/templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ApiResponse<TemplateDetailResponse> updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTemplateRequest request) {
        return ApiResponse.ok(templateService.updateTemplate(id, request));
    }

    /**
     * Admin: 커스텀 템플릿 비활성화
     */
    @DeleteMapping("/admin/templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ApiResponse<Void> deactivateTemplate(@PathVariable Long id) {
        templateService.deactivateTemplate(id);
        return ApiResponse.ok(null);
    }
}
