-- ============================================
-- V8: approval_template + document_content 스키마 확장 (H2)
-- ============================================

ALTER TABLE approval_template ADD COLUMN schema_definition CLOB NULL;
ALTER TABLE approval_template ADD COLUMN schema_version INT NOT NULL DEFAULT 0;
ALTER TABLE approval_template ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE approval_template ADD COLUMN category VARCHAR(50) NULL;
ALTER TABLE approval_template ADD COLUMN icon VARCHAR(50) NULL;
ALTER TABLE approval_template ADD COLUMN created_by BIGINT NULL;

ALTER TABLE approval_template
  ADD CONSTRAINT fk_template_created_by FOREIGN KEY (created_by) REFERENCES "user"(id);

ALTER TABLE document_content ADD COLUMN schema_version INT NULL;
ALTER TABLE document_content ADD COLUMN schema_definition_snapshot CLOB NULL;
