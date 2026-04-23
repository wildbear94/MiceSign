package com.micesign.repository;

import com.micesign.domain.NotificationLog;
import com.micesign.domain.enums.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long>, JpaSpecificationExecutor<NotificationLog> {

    List<NotificationLog> findByStatusAndRetryCountLessThan(NotificationStatus status, int maxRetries);

    // Phase 29 — PENDING row 조회 (ApprovalEmailSender.findOrCreatePendingLog 지원, D-A2 idempotency)
    // NotificationLog.eventType 필드는 String 타입(@Column이며 @Enumerated 미사용 — 등록 알림은 RegistrationEventType.name() 저장).
    Optional<NotificationLog> findByDocumentIdAndEventTypeAndRecipientId(
            Long documentId, String eventType, Long recipientId);
}
