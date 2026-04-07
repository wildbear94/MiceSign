-- ============================================
-- V8: approval_template + document_content 스키마 확장
-- Phase 12: JSON 스키마 기반 동적 양식 지원
-- ============================================

-- approval_template 확장
ALTER TABLE approval_template
  ADD COLUMN schema_definition LONGTEXT NULL AFTER sort_order,
  ADD COLUMN schema_version INT NOT NULL DEFAULT 0 AFTER schema_definition,
  ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT FALSE AFTER schema_version,
  ADD COLUMN category VARCHAR(50) NULL AFTER is_custom,
  ADD COLUMN icon VARCHAR(50) NULL AFTER category,
  ADD COLUMN created_by BIGINT NULL AFTER icon;

ALTER TABLE approval_template
  ADD CONSTRAINT fk_template_created_by FOREIGN KEY (created_by) REFERENCES `user`(id);

-- document_content 확장
ALTER TABLE document_content
  ADD COLUMN schema_version INT NULL AFTER form_data,
  ADD COLUMN schema_definition_snapshot LONGTEXT NULL AFTER schema_version;
