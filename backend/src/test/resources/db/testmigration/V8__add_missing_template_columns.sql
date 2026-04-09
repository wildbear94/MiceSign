-- V8__add_missing_template_columns.sql
-- Add columns to approval_template that exist in production schema but are missing in test schema
-- These were added in production V8 (schema_support), V10 (option_tables), V12 (budget_integration)

ALTER TABLE approval_template ADD COLUMN budget_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE approval_template ADD COLUMN schema_definition CLOB NULL;
ALTER TABLE approval_template ADD COLUMN schema_version INT NOT NULL DEFAULT 0;
ALTER TABLE approval_template ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE approval_template ADD COLUMN category VARCHAR(50) NULL;
ALTER TABLE approval_template ADD COLUMN icon VARCHAR(50) NULL;
ALTER TABLE approval_template ADD COLUMN created_by BIGINT NULL;

-- Set budget_enabled for EXPENSE template
UPDATE approval_template SET budget_enabled = TRUE WHERE code IN ('EXPENSE', 'PURCHASE', 'BUSINESS_TRIP', 'OVERTIME');

-- Add schema snapshot columns to document_content
ALTER TABLE document_content ADD COLUMN schema_version INT NULL;
ALTER TABLE document_content ADD COLUMN schema_definition_snapshot CLOB NULL;
