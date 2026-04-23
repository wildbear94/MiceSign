package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.user.UserSearchResponse;
import com.micesign.service.UserSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public user search endpoint for drafterId combobox autocomplete.
 * Accessible to all authenticated users (USER/ADMIN/SUPER_ADMIN).
 * Unlike UserManagementController (/api/v1/admin/users), no @PreAuthorize — JWT 필터만 요구.
 * Returns minimal DTO {id, name, departmentName} (T-30-04), ACTIVE 사용자만, size clamp 1~50.
 *
 * Open Q1 resolution: 전체 ACTIVE 가시성 (APR-01 결재선 구성 정책과 일관).
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserSearchController {

    private final UserSearchService userSearchService;

    public UserSearchController(UserSearchService userSearchService) {
        this.userSearchService = userSearchService;
    }

    @GetMapping("/search")
    public ApiResponse<List<UserSearchResponse>> searchUsers(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(userSearchService.searchUsers(q, size));
    }
}
