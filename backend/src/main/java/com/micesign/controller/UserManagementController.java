package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.user.*;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.UserManagementService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public class UserManagementController {

    private final UserManagementService userManagementService;

    public UserManagementController(UserManagementService userManagementService) {
        this.userManagementService = userManagementService;
    }

    @GetMapping
    public ApiResponse<Page<UserListResponse>> getUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) UserStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.ok(userManagementService.getUsers(keyword, departmentId, role, status, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserDetailResponse> getUserById(@PathVariable Long id) {
        return ApiResponse.ok(userManagementService.getUserById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserDetailResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        UserDetailResponse response = userManagementService.createUser(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserDetailResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ApiResponse.ok(userManagementService.updateUser(id, request, currentUser));
    }

    @PatchMapping("/{id}/deactivate")
    public ApiResponse<Void> deactivateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        userManagementService.deactivateUser(id, currentUser);
        return ApiResponse.ok(null);
    }
}
