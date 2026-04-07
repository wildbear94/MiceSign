package com.micesign.repository;

import com.micesign.domain.BudgetIntegrationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetIntegrationLogRepository extends JpaRepository<BudgetIntegrationLog, Long> {

    List<BudgetIntegrationLog> findByDocumentId(Long documentId);

    Optional<BudgetIntegrationLog> findByDocumentIdAndEventType(Long documentId, String eventType);

    Optional<BudgetIntegrationLog> findTopByDocumentIdAndEventTypeOrderByCreatedAtDesc(Long documentId, String eventType);
}
