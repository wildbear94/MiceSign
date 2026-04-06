-- ============================================
-- V8: document_content에 schema_version, schema_definition_snapshot 컬럼 추가
-- 문서 생성 시점의 스키마 스냅샷 저장
-- ============================================

ALTER TABLE document_content
    ADD COLUMN schema_version INT NULL COMMENT '생성 시점 스키마 버전' AFTER form_data,
    ADD COLUMN schema_definition_snapshot LONGTEXT NULL COMMENT '생성 시점 스키마 정의 스냅샷 (JSON)' AFTER schema_version;
