package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.position.*;
import com.micesign.service.PositionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
            @Valid @RequestBody CreatePositionRequest request) {
        PositionResponse response = positionService.createPosition(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<PositionResponse> updatePosition(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePositionRequest request) {
        return ApiResponse.ok(positionService.updatePosition(id, request));
    }

    @PutMapping("/reorder")
    public ApiResponse<Void> reorderPositions(@Valid @RequestBody ReorderPositionsRequest request) {
        positionService.reorderPositions(request);
        return ApiResponse.ok(null);
    }

    @PatchMapping("/{id}/deactivate")
    public ApiResponse<Void> deactivatePosition(@PathVariable Long id) {
        positionService.deactivatePosition(id);
        return ApiResponse.ok(null);
    }
}
