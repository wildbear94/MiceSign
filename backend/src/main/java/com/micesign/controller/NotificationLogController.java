package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.NotificationLog;
import com.micesign.domain.enums.NotificationStatus;
import com.micesign.dto.notification.NotificationLogResponse;
import com.micesign.repository.DocumentRepository;
import com.micesign.repository.NotificationLogRepository;
import com.micesign.repository.UserRepository;
import com.micesign.service.NotificationService;
import com.micesign.specification.NotificationLogSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/admin/notifications")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class NotificationLogController {

    private final NotificationLogRepository notificationLogRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final NotificationService notificationService;

    public NotificationLogController(NotificationLogRepository notificationLogRepository,
                                     UserRepository userRepository,
                                     DocumentRepository documentRepository,
                                     NotificationService notificationService) {
        this.notificationLogRepository = notificationLogRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.notificationService = notificationService;
    }

    @GetMapping
    public ApiResponse<Page<NotificationLogResponse>> getNotificationLogs(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<NotificationLog> logs = notificationLogRepository.findAll(
                NotificationLogSpecification.withFilters(status, eventType, startDate, endDate), pageable);
        Page<NotificationLogResponse> response = logs.map(this::toResponse);
        return ApiResponse.ok(response);
    }

    @PostMapping("/{id}/resend")
    public ApiResponse<Void> resendNotification(@PathVariable Long id) {
        NotificationLog log = notificationLogRepository.findById(id)
                .orElseThrow(() -> new BusinessException("NTF_NOT_FOUND", "알림을 찾을 수 없습니다.", 404));
        if (log.getStatus() != NotificationStatus.FAILED) {
            throw new BusinessException("NTF_NOT_FAILED", "실패한 알림만 재발송할 수 있습니다.");
        }
        notificationService.resend(log);
        return ApiResponse.ok(null);
    }

    private NotificationLogResponse toResponse(NotificationLog log) {
        String recipientName = null;
        if (log.getRecipientId() != null) {
            recipientName = userRepository.findById(log.getRecipientId())
                    .map(user -> user.getName())
                    .orElse(null);
        }

        String documentTitle = null;
        if (log.getDocumentId() != null) {
            documentTitle = documentRepository.findById(log.getDocumentId())
                    .map(doc -> doc.getTitle())
                    .orElse(null);
        }

        return new NotificationLogResponse(
                log.getId(),
                log.getRecipientId(),
                recipientName,
                log.getRecipientEmail(),
                log.getEventType(),
                log.getDocumentId(),
                documentTitle,
                log.getSubject(),
                log.getStatus().name(),
                log.getRetryCount(),
                log.getErrorMessage(),
                log.getSentAt(),
                log.getCreatedAt()
        );
    }
}
