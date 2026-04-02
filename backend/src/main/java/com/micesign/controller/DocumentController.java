package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.*;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.DocumentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DocumentResponse>> createDocument(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody CreateDocumentRequest request) {
        DocumentResponse response = documentService.createDocument(user.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<DocumentResponse> updateDocument(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long id,
            @Valid @RequestBody UpdateDocumentRequest request) {
        return ApiResponse.ok(documentService.updateDocument(user.getUserId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteDocument(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long id) {
        documentService.deleteDocument(user.getUserId(), id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/my")
    public ApiResponse<Page<DocumentResponse>> getMyDocuments(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) List<DocumentStatus> status) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ApiResponse.ok(documentService.getMyDocuments(user.getUserId(), status, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<DocumentDetailResponse> getDocumentDetail(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long id) {
        return ApiResponse.ok(documentService.getDocumentDetail(user.getUserId(), id));
    }
}
