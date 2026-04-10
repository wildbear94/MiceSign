package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.ApprovalService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

/**
 * Approval workflow endpoints for all authenticated users.
 * Pending/completed queries use ApprovalService; approve/reject actions
 * will be fully implemented in Phase 7.
 */
@RestController
@RequestMapping("/api/v1/approvals")
public class ApprovalController {

    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @GetMapping("/pending")
    public ApiResponse<Page<?>> getPendingApprovals(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ApiResponse.ok(approvalService.getPendingApprovals(user.getUserId(), pageable));
    }

    @GetMapping("/completed")
    public ApiResponse<Page<?>> getCompletedApprovals(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ApiResponse.ok(approvalService.getCompletedApprovals(user.getUserId(), pageable));
    }
}
