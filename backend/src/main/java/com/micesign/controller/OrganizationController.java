package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.department.DepartmentMemberResponse;
import com.micesign.dto.department.DepartmentTreeResponse;
import com.micesign.service.DepartmentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public organization endpoints accessible to all authenticated users.
 * Used by OrgTreePickerModal for approval line selection.
 * Unlike DepartmentController (/api/v1/admin/departments), no ADMIN role required.
 */
@RestController
@RequestMapping("/api/v1/organization")
public class OrganizationController {

    private final DepartmentService departmentService;

    public OrganizationController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping("/departments")
    public ApiResponse<List<DepartmentTreeResponse>> getDepartmentTree() {
        return ApiResponse.ok(departmentService.getDepartmentTree(false));
    }

    @GetMapping("/departments/{id}/members")
    public ApiResponse<List<DepartmentMemberResponse>> getDepartmentMembers(@PathVariable Long id) {
        return ApiResponse.ok(departmentService.getDepartmentMembers(id));
    }
}
