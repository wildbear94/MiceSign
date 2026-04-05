package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.option.CreateOptionSetRequest;
import com.micesign.dto.option.OptionSetResponse;
import com.micesign.service.OptionSetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/option-sets")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class OptionSetController {

    private final OptionSetService optionSetService;

    public OptionSetController(OptionSetService optionSetService) {
        this.optionSetService = optionSetService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OptionSetResponse>> create(
            @Valid @RequestBody CreateOptionSetRequest request) {
        OptionSetResponse response = optionSetService.create(request);
        return ResponseEntity.status(201).body(ApiResponse.ok(response));
    }

    @GetMapping
    public ApiResponse<List<OptionSetResponse>> list() {
        return ApiResponse.ok(optionSetService.getActiveOptionSets());
    }

    @GetMapping("/{id}")
    public ApiResponse<OptionSetResponse> getById(@PathVariable Long id) {
        return ApiResponse.ok(optionSetService.getById(id));
    }
}
