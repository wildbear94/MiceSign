package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.department.DepartmentMemberResponse;
import com.micesign.dto.department.DepartmentTreeResponse;
import com.micesign.service.DepartmentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public organization endpoints accessible by all authenticated users.
 * Used by the approval line editor to browse the org tree and select approvers.
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
