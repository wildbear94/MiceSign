-- ============================================
-- V6: approval_template에 schema_definition, schema_version 컬럼 추가
-- 동적 템플릿 지원을 위한 스키마 정의 저장
-- ============================================

ALTER TABLE approval_template
    ADD COLUMN schema_definition LONGTEXT NULL COMMENT 'JSON 스키마 정의' AFTER sort_order,
    ADD COLUMN schema_version INT NOT NULL DEFAULT 0 COMMENT '스키마 버전' AFTER schema_definition;
