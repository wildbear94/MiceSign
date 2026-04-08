package com.micesign.repository;

import com.micesign.domain.RegistrationRequest;
import com.micesign.domain.enums.RegistrationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, Long> {

    boolean existsByEmailAndStatus(String email, RegistrationStatus status);

    List<RegistrationRequest> findByEmailOrderByCreatedAtDesc(String email);

    Optional<RegistrationRequest> findByEmailAndStatus(String email, RegistrationStatus status);

    Page<RegistrationRequest> findByStatus(RegistrationStatus status, Pageable pageable);

    @Modifying
    @Query("UPDATE RegistrationRequest r SET r.status = :newStatus, r.updatedAt = CURRENT_TIMESTAMP WHERE r.status = :currentStatus AND r.createdAt < :cutoff")
    int updateStatusByStatusAndCreatedAtBefore(@Param("newStatus") RegistrationStatus newStatus, @Param("currentStatus") RegistrationStatus currentStatus, @Param("cutoff") LocalDateTime cutoff);
}
