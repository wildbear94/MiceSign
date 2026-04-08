package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.NotificationLog;
import com.micesign.domain.enums.NotificationStatus;
import com.micesign.dto.notification.NotificationLogResponse;
import com.micesign.repository.NotificationLogRepository;
import com.micesign.service.EmailService;
import com.micesign.specification.NotificationLogSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/notifications")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class NotificationLogController {

    private final NotificationLogRepository notificationLogRepository;
    private final EmailService emailService;

    public NotificationLogController(NotificationLogRepository notificationLogRepository,
                                     EmailService emailService) {
        this.notificationLogRepository = notificationLogRepository;
        this.emailService = emailService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationLogResponse>>> searchNotificationLogs(
            @RequestParam(required = false) Long recipientId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long documentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        NotificationStatus notificationStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                notificationStatus = NotificationStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                throw new BusinessException("INVALID_STATUS", "유효하지 않은 상태입니다: " + status);
            }
        }

        Page<NotificationLog> logs = notificationLogRepository.findAll(
                NotificationLogSpecification.withRecipientId(recipientId)
                        .and(NotificationLogSpecification.withEventType(eventType))
                        .and(NotificationLogSpecification.withStatus(notificationStatus))
                        .and(NotificationLogSpecification.withDocumentId(documentId))
                        .and(NotificationLogSpecification.withDateFrom(dateFrom))
                        .and(NotificationLogSpecification.withDateTo(dateTo)),
                pageable);

        Page<NotificationLogResponse> response = logs.map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/resend")
    public ResponseEntity<ApiResponse<Void>> resendNotification(@PathVariable Long id) {
        NotificationLog log = notificationLogRepository.findById(id)
                .orElseThrow(() -> new BusinessException("NOTIFICATION_NOT_FOUND",
                        "알림 로그를 찾을 수 없습니다.", 404));

        // Resend the email
        emailService.sendEmail(
                log.getRecipientEmail(),
                log.getSubject(),
                "notification-resend",
                Map.of("eventType", log.getEventType(),
                       "documentId", log.getDocumentId() != null ? log.getDocumentId() : ""));

        // Update status to PENDING for retry
        log.setStatus(NotificationStatus.PENDING);
        log.setRetryCount(0);
        log.setErrorMessage(null);
        notificationLogRepository.save(log);

        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private NotificationLogResponse toResponse(NotificationLog log) {
        return new NotificationLogResponse(
                log.getId(),
                log.getRecipientId(),
                log.getRecipient() != null ? log.getRecipient().getName() : null,
                log.getRecipientEmail(),
                log.getEventType(),
                log.getDocumentId(),
                null, // docNumber resolved separately if needed
                log.getSubject(),
                log.getStatus().name(),
                log.getRetryCount(),
                log.getErrorMessage(),
                log.getSentAt(),
                log.getCreatedAt()
        );
    }
}
