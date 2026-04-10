package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.position.*;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.PositionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/positions")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public class PositionController {

    private final PositionService positionService;

    public PositionController(PositionService positionService) {
        this.positionService = positionService;
    }

    @GetMapping
    public ApiResponse<List<PositionResponse>> getAllPositions() {
        return ApiResponse.ok(positionService.getAllPositions());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PositionResponse>> createPosition(
            @Valid @RequestBody CreatePositionRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        PositionResponse response = positionService.createPosition(request, user.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<PositionResponse> updatePosition(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePositionRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok(positionService.updatePosition(id, request, user.getUserId()));
    }

    @PutMapping("/reorder")
    public ApiResponse<Void> reorderPositions(@Valid @RequestBody ReorderPositionsRequest request) {
        positionService.reorderPositions(request);
        return ApiResponse.ok(null);
    }

    @PatchMapping("/{id}/deactivate")
    public ApiResponse<Void> deactivatePosition(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        positionService.deactivatePosition(id, user.getUserId());
        return ApiResponse.ok(null);
    }
}
