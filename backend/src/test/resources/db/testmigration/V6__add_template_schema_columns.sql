-- V6: approval_template에 schema_definition, schema_version 컬럼 추가 (H2)

ALTER TABLE approval_template
    ADD COLUMN schema_definition CLOB NULL;

ALTER TABLE approval_template
    ADD COLUMN schema_version INT NOT NULL DEFAULT 0;
