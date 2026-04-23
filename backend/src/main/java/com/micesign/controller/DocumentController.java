package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.domain.enums.UserRole;
import com.micesign.dto.document.*;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.DocumentAttachmentService;
import com.micesign.service.DocumentService;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Collections;
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
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> createDocument(
            @Valid @RequestBody CreateDocumentRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        DocumentDetailResponse detail = documentService.createDocument(request, user.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(detail));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> updateDocument(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDocumentRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        DocumentDetailResponse detail = documentService.updateDocument(id, request, user.getUserId());
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> getMyDocuments(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails user) {
        UserRole role = UserRole.valueOf(user.getRole());
        List<DocumentStatus> myStatuses = Collections.emptyList();
        if (status != null && !status.isBlank()) {
            try {
                myStatuses = List.of(DocumentStatus.valueOf(status));
            } catch (IllegalArgumentException ex) {
                throw new BusinessException("VALIDATION_ERROR",
                        "상태 값이 올바르지 않습니다: " + status, 400);
            }
        }
        DocumentSearchCondition condition = new DocumentSearchCondition(
                null, myStatuses, null, null, null, "my", null);
        PageRequest pageable = PageRequest.of(page, size);
        Page<DocumentResponse> result = documentService.searchDocuments(
                condition, user.getUserId(), role, user.getDepartmentId(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> getDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        UserRole role = UserRole.valueOf(user.getRole());
        DocumentDetailResponse detail = documentService.getDocument(
                id, user.getUserId(), role, user.getDepartmentId());
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        documentService.deleteDocument(id, user.getUserId());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> submitDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        DocumentDetailResponse detail = documentService.submitDocument(id, user.getUserId());
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping("/{id}/withdraw")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> withdrawDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        DocumentDetailResponse detail = documentService.withdrawDocument(id, user.getUserId());
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping("/{id}/rewrite")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> rewriteDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        DocumentDetailResponse detail = documentService.rewriteDocument(id, user.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(detail));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> searchDocuments(
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "status", required = false) List<String> rawStatuses,
            @RequestParam(required = false) String templateCode,
            @RequestParam(required = false) Long drafterId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "my") String tab,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails user) {

        UserRole role = UserRole.valueOf(user.getRole());

        // Plan 30-02 Rule 4 결정: D-A7 403 가드 제거. FSD FN-SEARCH-001 "권한: ALL" +
        // D-A1 에 따라 권한 predicate 가 USER 결과를 본인+approval_line 참여자로 자동 좁힘.
        // USER 가 tab=all (프론트 'search' 탭) 로 호출 시 Repository 의 권한 predicate 가 SoT.

        // 수동 enum 변환 — Pitfall 2 (500 유출 방지) + Pitfall 9 (빈 값 필터)
        List<DocumentStatus> statuses;
        if (rawStatuses == null || rawStatuses.isEmpty()) {
            statuses = Collections.emptyList();
        } else {
            try {
                statuses = rawStatuses.stream()
                        .filter(s -> s != null && !s.isBlank())
                        .map(DocumentStatus::valueOf)
                        .toList();
            } catch (IllegalArgumentException ex) {
                throw new BusinessException("VALIDATION_ERROR",
                        "상태 값이 올바르지 않습니다: " + rawStatuses, 400);
            }
        }

        DocumentSearchCondition condition = new DocumentSearchCondition(
                keyword, statuses, templateCode, dateFrom, dateTo, tab, drafterId);
        PageRequest pageable = PageRequest.of(page, size);

        Page<DocumentResponse> result = documentService.searchDocuments(
                condition, user.getUserId(), role, user.getDepartmentId(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // --- Attachment endpoints ---

    @PostMapping("/{id}/attachments")
    public ResponseEntity<ApiResponse<List<AttachmentResponse>>> uploadAttachments(
            @PathVariable Long id,
            @RequestParam("files") MultipartFile[] files,
            @AuthenticationPrincipal CustomUserDetails user) {
        List<AttachmentResponse> responses = attachmentService.uploadFiles(user.getUserId(), id, files);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(responses));
    }

    @GetMapping("/{id}/attachments")
    public ResponseEntity<ApiResponse<List<AttachmentResponse>>> getAttachments(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        List<AttachmentResponse> responses = attachmentService.getAttachmentsByDocumentId(user.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long attachmentId,
            @AuthenticationPrincipal CustomUserDetails user) {
        AttachmentResponse metadata = attachmentService.getAttachmentMetadata(attachmentId);
        UserRole role = UserRole.valueOf(user.getRole());
        InputStreamResource resource = attachmentService.downloadAttachment(
                attachmentId, user.getUserId(), role, user.getDepartmentId());

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
    public ResponseEntity<ApiResponse<Void>> deleteAttachment(
            @PathVariable Long attachmentId,
            @AuthenticationPrincipal CustomUserDetails user) {
        attachmentService.deleteAttachment(attachmentId, user.getUserId());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
