-- ============================================
-- V9: 템플릿 스키마 버전 이력 테이블
-- Phase 12: 스키마 변경 시 기존 문서 보존
-- ============================================

CREATE TABLE template_schema_version (
  id BIGINT NOT NULL AUTO_INCREMENT,
  template_id BIGINT NOT NULL,
  version INT NOT NULL,
  schema_definition LONGTEXT NOT NULL,
  change_description VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_schema_version_template FOREIGN KEY (template_id)
    REFERENCES approval_template(id) ON DELETE CASCADE,
  CONSTRAINT uk_template_version UNIQUE (template_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
