package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.*;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.DocumentAttachmentService;
import com.micesign.service.DocumentService;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final DocumentAttachmentService attachmentService;

    public DocumentController(DocumentService documentService,
                               DocumentAttachmentService attachmentService) {
        this.documentService = documentService;
        this.attachmentService = attachmentService;
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

    @PostMapping("/{id}/submit")
    public ApiResponse<DocumentResponse> submitDocument(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long id) {
        return ApiResponse.ok(documentService.submitDocument(user.getUserId(), id));
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

    @PostMapping("/{id}/withdraw")
    public ApiResponse<DocumentResponse> withdrawDocument(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long id) {
        return ApiResponse.ok(documentService.withdrawDocument(user.getUserId(), id));
    }

    @PostMapping("/{id}/rewrite")
    public ResponseEntity<ApiResponse<DocumentResponse>> rewriteDocument(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long id) {
        DocumentResponse response = documentService.rewriteDocument(user.getUserId(), id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    // --- Attachment endpoints ---

    @PostMapping("/{docId}/attachments")
    public ResponseEntity<ApiResponse<List<AttachmentResponse>>> uploadAttachments(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long docId,
            @RequestParam("files") MultipartFile[] files) {
        List<AttachmentResponse> responses = attachmentService.uploadFiles(user.getUserId(), docId, files);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(responses));
    }

    @GetMapping("/{docId}/attachments")
    public ApiResponse<List<AttachmentResponse>> getAttachments(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long docId) {
        return ApiResponse.ok(attachmentService.getAttachmentsByDocumentId(docId));
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<InputStreamResource> downloadAttachment(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long attachmentId) {
        AttachmentResponse metadata = attachmentService.getAttachmentMetadata(attachmentId);
        InputStreamResource resource = attachmentService.downloadFile(user.getUserId(), attachmentId);

        String encodedName = URLEncoder.encode(metadata.originalName(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"file\"; filename*=UTF-8''" + encodedName)
                .contentType(MediaType.parseMediaType(metadata.mimeType()))
                .contentLength(metadata.fileSize())
                .body(resource);
    }

    @DeleteMapping("/attachments/{attachmentId}")
    public ApiResponse<Void> deleteAttachment(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long attachmentId) {
        attachmentService.deleteAttachment(user.getUserId(), attachmentId);
        return ApiResponse.ok(null);
    }
}
