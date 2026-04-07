package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.template.SchemaDefinition;
import com.micesign.dto.template.TemplateResponse;
import com.micesign.service.TemplateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public template endpoints for document creation.
 */
@RestController
@RequestMapping("/api/v1/templates")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TemplateResponse>>> listActiveTemplates() {
        List<TemplateResponse> templates = templateService.getActiveTemplates();
        return ResponseEntity.ok(ApiResponse.ok(templates));
    }

    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<TemplateResponse>> getTemplateByCode(
            @PathVariable String code) {
        TemplateResponse template = templateService.getTemplateByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(template));
    }

    @GetMapping("/{code}/schema")
    public ResponseEntity<ApiResponse<SchemaDefinition>> getTemplateSchema(
            @PathVariable String code,
            @RequestParam(required = false) Integer version) {
        SchemaDefinition schema = templateService.getTemplateSchemaByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(schema));
    }
}
