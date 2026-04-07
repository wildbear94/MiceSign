package com.micesign.repository;

import com.micesign.domain.ApprovalTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApprovalTemplateRepository extends JpaRepository<ApprovalTemplate, Long> {

    List<ApprovalTemplate> findByIsActiveTrueOrderBySortOrder();

    Optional<ApprovalTemplate> findByCode(String code);

    boolean existsByPrefix(String prefix);

    boolean existsByPrefixAndIdNot(String prefix, Long id);

    boolean existsByCode(String code);

    Optional<ApprovalTemplate> findByIdAndIsCustomTrue(Long id);
}
