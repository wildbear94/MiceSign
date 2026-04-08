package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.template.TemplateResponse;
import com.micesign.service.TemplateService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/templates")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ApiResponse<List<TemplateResponse>> getActiveTemplates() {
        return ApiResponse.ok(templateService.getActiveTemplates());
    }
}
