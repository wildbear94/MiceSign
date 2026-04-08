package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.registration.RegistrationStatusResponse;
import com.micesign.dto.registration.RegistrationSubmitRequest;
import com.micesign.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/registration")
public class RegistrationController {

    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RegistrationStatusResponse>> submit(
            @Valid @RequestBody RegistrationSubmitRequest request) {
        RegistrationStatusResponse response = registrationService.submit(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/status")
    public ApiResponse<RegistrationStatusResponse> getStatus(@RequestParam String email) {
        return ApiResponse.ok(registrationService.getStatusByEmail(email));
    }
}
