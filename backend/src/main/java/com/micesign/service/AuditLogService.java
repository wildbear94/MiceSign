package com.micesign.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.domain.AuditLog;
import com.micesign.dto.audit.AuditLogResponse;
import com.micesign.repository.AuditLogRepository;
import com.micesign.specification.AuditLogSpecification;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

/**
 * Immutable, append-only audit log service.
 * Never throws -- swallows all exceptions to avoid failing the caller.
 * Uses REQUIRES_NEW propagation so audit logging survives caller rollback.
 */
@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditLogService(AuditLogRepository auditLogRepository,
                           ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Log an audit entry, extracting IP and User-Agent from the current HTTP request.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Long userId, String action, String targetType, Long targetId, Object detail) {
        try {
            AuditLog entry = new AuditLog();
            entry.setUserId(userId);
            entry.setAction(action);
            entry.setTargetType(targetType);
            entry.setTargetId(targetId);
            entry.setDetail(convertDetail(detail));

            // Extract IP and User-Agent from current request context
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                entry.setIpAddress(getClientIp(request));
                entry.setUserAgent(request.getHeader("User-Agent"));
            }

            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to write audit log: action={}, userId={}, error={}",
                    action, userId, e.getMessage());
        }
    }

    /**
     * Log an audit entry with an explicit HttpServletRequest.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Long userId, String action, String targetType, Long targetId,
                    Object detail, HttpServletRequest request) {
        try {
            AuditLog entry = new AuditLog();
            entry.setUserId(userId);
            entry.setAction(action);
            entry.setTargetType(targetType);
            entry.setTargetId(targetId);
            entry.setDetail(convertDetail(detail));

            if (request != null) {
                entry.setIpAddress(getClientIp(request));
                entry.setUserAgent(request.getHeader("User-Agent"));
            }

            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to write audit log: action={}, userId={}, error={}",
                    action, userId, e.getMessage());
        }
    }

    /**
     * Search audit logs with filters.
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(Long userId, String action, String targetType,
                                          LocalDateTime from, LocalDateTime to, Pageable pageable) {
        Specification<AuditLog> spec = Specification.where(AuditLogSpecification.withUserId(userId))
                .and(AuditLogSpecification.withAction(action))
                .and(AuditLogSpecification.withTargetType(targetType))
                .and(AuditLogSpecification.withDateFrom(from))
                .and(AuditLogSpecification.withDateTo(to));

        return auditLogRepository.findAll(spec, pageable)
                .map(entry -> new AuditLogResponse(
                        entry.getId(),
                        entry.getUserId(),
                        entry.getUser() != null ? entry.getUser().getName() : null,
                        entry.getAction(),
                        entry.getTargetType(),
                        entry.getTargetId(),
                        entry.getDetail(),
                        entry.getIpAddress(),
                        entry.getCreatedAt()
                ));
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String convertDetail(Object detail) {
        if (detail == null) {
            return null;
        }
        if (detail instanceof String s) {
            return s;
        }
        try {
            return objectMapper.writeValueAsString(detail);
        } catch (Exception e) {
            return detail.toString();
        }
    }
}
