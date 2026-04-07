package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.document.ApprovalActionRequest;
import com.micesign.dto.document.DocumentDetailResponse;
import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.PendingApprovalResponse;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.ApprovalService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/approvals")
public class ApprovalController {

    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @PostMapping("/{lineId}/approve")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> approve(
            @PathVariable Long lineId,
            @RequestBody(required = false) ApprovalActionRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        DocumentDetailResponse detail = approvalService.approve(lineId, request, user.getUserId());
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping("/{lineId}/reject")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> reject(
            @PathVariable Long lineId,
            @Valid @RequestBody ApprovalActionRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        DocumentDetailResponse detail = approvalService.reject(lineId, request, user.getUserId());
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<Page<PendingApprovalResponse>>> getPendingApprovals(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails user) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<PendingApprovalResponse> result = approvalService.getPendingApprovals(user.getUserId(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/completed")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> getCompletedApprovals(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails user) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "completedAt"));
        Page<DocumentResponse> result = approvalService.getCompletedApprovals(user.getUserId(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
