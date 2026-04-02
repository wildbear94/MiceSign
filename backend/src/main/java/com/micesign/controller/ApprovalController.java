package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.document.ApprovalActionRequest;
import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.PendingApprovalResponse;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.ApprovalService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
    public ApiResponse<Void> approve(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long lineId,
            @RequestBody(required = false) ApprovalActionRequest request) {
        approvalService.approve(user.getUserId(), lineId,
                request != null ? request.comment() : null);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{lineId}/reject")
    public ApiResponse<Void> reject(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long lineId,
            @RequestBody ApprovalActionRequest request) {
        approvalService.reject(user.getUserId(), lineId,
                request != null ? request.comment() : null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/pending")
    public ApiResponse<Page<PendingApprovalResponse>> getPendingApprovals(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size);
        return ApiResponse.ok(approvalService.getPendingApprovals(user.getUserId(), pageable));
    }

    @GetMapping("/completed")
    public ApiResponse<Page<DocumentResponse>> getCompletedDocuments(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "completedAt"));
        return ApiResponse.ok(approvalService.getCompletedDocuments(user.getUserId(), pageable));
    }
}
