package com.micesign.repository;

import com.micesign.domain.TemplateSchemaVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TemplateSchemaVersionRepository extends JpaRepository<TemplateSchemaVersion, Long> {

    List<TemplateSchemaVersion> findByTemplateIdOrderByVersionDesc(Long templateId);

    Optional<TemplateSchemaVersion> findByTemplateIdAndVersion(Long templateId, int version);
}
