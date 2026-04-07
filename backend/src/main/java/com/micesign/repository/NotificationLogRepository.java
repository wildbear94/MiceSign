package com.micesign.repository;

import com.micesign.domain.NotificationLog;
import com.micesign.domain.enums.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long>, JpaSpecificationExecutor<NotificationLog> {

    List<NotificationLog> findByStatusAndRetryCountLessThan(NotificationStatus status, int maxRetries);
}
