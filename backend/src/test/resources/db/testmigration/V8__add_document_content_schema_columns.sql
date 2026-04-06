-- V8: document_content에 schema_version, schema_definition_snapshot 컬럼 추가 (H2)

ALTER TABLE document_content
    ADD COLUMN schema_version INT NULL;

ALTER TABLE document_content
    ADD COLUMN schema_definition_snapshot CLOB NULL;
