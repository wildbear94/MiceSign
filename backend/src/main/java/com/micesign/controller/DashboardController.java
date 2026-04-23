package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.domain.enums.UserRole;
import com.micesign.dto.dashboard.DashboardSummaryResponse;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    // Phase 31 Plan 02 — 3-arg role-based 시그니처로 호출.
    // CustomUserDetails.getRole() 이 String 반환 → UserRole.valueOf 로 파싱.
    // JWT 에서 파싱된 값이므로 클라이언트 조작 불가 (T-31-T1 방어).
    @GetMapping({"", "/summary"})
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getDashboard(
            @AuthenticationPrincipal CustomUserDetails user) {
        UserRole role = UserRole.valueOf(user.getRole());
        DashboardSummaryResponse summary = dashboardService.getDashboardSummary(
                user.getUserId(), role, user.getDepartmentId());
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }
}
