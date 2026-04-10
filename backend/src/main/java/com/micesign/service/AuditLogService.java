package com.micesign.service;

import com.micesign.domain.AuditLog;
import com.micesign.domain.User;
import com.micesign.dto.audit.AuditLogResponse;
import com.micesign.repository.AuditLogRepository;
import com.micesign.repository.UserRepository;
import com.micesign.specification.AuditLogSpecification;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AuditLogService(AuditLogRepository auditLogRepository,
                           UserRepository userRepository,
                           ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Create an audit log entry.
     */
    public void log(Long userId, String action, String targetType, Long targetId, Map<String, Object> details) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUserId(userId);
        auditLog.setAction(action);
        auditLog.setTargetType(targetType);
        auditLog.setTargetId(targetId);
        if (details != null && !details.isEmpty()) {
            try {
                auditLog.setDetail(objectMapper.writeValueAsString(details));
            } catch (JsonProcessingException e) {
                auditLog.setDetail(details.toString());
            }
        }
        auditLogRepository.save(auditLog);
    }

    /**
     * Search audit logs with filters, returning responses with user names resolved.
     * Eliminates N+1 by batch-loading all users for the result page.
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(Long userId, String action, String targetType,
                                          LocalDateTime dateFrom, LocalDateTime dateTo,
                                          Pageable pageable) {
        Page<AuditLog> logs = auditLogRepository.findAll(
                AuditLogSpecification.withFilters(userId, action, targetType, dateFrom, dateTo),
                pageable);

        // Batch-load all user names to avoid N+1
        List<Long> userIds = logs.getContent().stream()
                .map(AuditLog::getUserId)
                .filter(id -> id != null)
                .distinct()
                .toList();

        Map<Long, String> userNameMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));

        return logs.map(log -> new AuditLogResponse(
                log.getId(),
                log.getUserId(),
                userNameMap.getOrDefault(log.getUserId(), ""),
                log.getAction(),
                log.getTargetType(),
                log.getTargetId(),
                log.getDetail(),
                log.getCreatedAt()
        ));
    }
}
