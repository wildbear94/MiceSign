package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.dashboard.DashboardSummaryResponse;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.DashboardService;
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

    @GetMapping("/summary")
    public ApiResponse<DashboardSummaryResponse> getSummary(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok(dashboardService.getSummary(user.getUserId()));
    }
}
