package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.department.*;
import com.micesign.service.DepartmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/departments")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public ApiResponse<List<DepartmentTreeResponse>> getDepartmentTree(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ApiResponse.ok(departmentService.getDepartmentTree(includeInactive));
    }

    @GetMapping("/{id}/members")
    public ApiResponse<List<DepartmentMemberResponse>> getDepartmentMembers(@PathVariable Long id) {
        return ApiResponse.ok(departmentService.getDepartmentMembers(id));
    }

    @GetMapping("/{id}/user-count")
    public ApiResponse<Map<String, Long>> getUserCount(@PathVariable Long id) {
        long count = departmentService.getUserCountByDepartment(id);
        return ApiResponse.ok(Map.of("activeUserCount", count));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DepartmentTreeResponse>> createDepartment(
            @Valid @RequestBody CreateDepartmentRequest request) {
        DepartmentTreeResponse response = departmentService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<DepartmentTreeResponse> updateDepartment(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDepartmentRequest request) {
        return ApiResponse.ok(departmentService.updateDepartment(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    public ApiResponse<Void> deactivateDepartment(@PathVariable Long id) {
        departmentService.deactivateDepartment(id);
        return ApiResponse.ok(null);
    }
}
