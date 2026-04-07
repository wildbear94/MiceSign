package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.domain.AuditLog;
import com.micesign.dto.audit.AuditLogResponse;
import com.micesign.repository.AuditLogRepository;
import com.micesign.repository.UserRepository;
import com.micesign.specification.AuditLogSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditLogController(AuditLogRepository auditLogRepository,
                              UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> searchAuditLogs(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<AuditLog> logs = auditLogRepository.findAll(
                AuditLogSpecification.withUserId(userId)
                        .and(AuditLogSpecification.withAction(action))
                        .and(AuditLogSpecification.withTargetType(targetType))
                        .and(AuditLogSpecification.withDateFrom(dateFrom))
                        .and(AuditLogSpecification.withDateTo(dateTo)),
                pageable);

        Page<AuditLogResponse> response = logs.map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    private AuditLogResponse toResponse(AuditLog log) {
        String userName = null;
        if (log.getUserId() != null) {
            userName = userRepository.findById(log.getUserId())
                    .map(user -> user.getName())
                    .orElse(null);
        }
        return new AuditLogResponse(
                log.getId(),
                log.getUserId(),
                userName,
                log.getAction(),
                log.getTargetType(),
                log.getTargetId(),
                log.getDetail(),
                log.getIpAddress(),
                log.getCreatedAt()
        );
    }
}
