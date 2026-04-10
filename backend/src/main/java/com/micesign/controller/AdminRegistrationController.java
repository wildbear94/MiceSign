package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.domain.enums.RegistrationStatus;
import com.micesign.dto.registration.ApproveRegistrationRequest;
import com.micesign.dto.registration.RejectRegistrationRequest;
import com.micesign.dto.registration.RegistrationListResponse;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/registrations")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminRegistrationController {

    private final RegistrationService registrationService;

    public AdminRegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @GetMapping
    public ApiResponse<Page<RegistrationListResponse>> getRegistrations(
            @RequestParam(required = false) RegistrationStatus status,
            Pageable pageable) {
        return ApiResponse.ok(registrationService.getRegistrations(status, pageable));
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<Void> approve(
            @PathVariable Long id,
            @Valid @RequestBody ApproveRegistrationRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        registrationService.approve(id, request, admin);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<Void> reject(
            @PathVariable Long id,
            @Valid @RequestBody RejectRegistrationRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        registrationService.reject(id, request, admin);
        return ApiResponse.ok(null);
    }
}
