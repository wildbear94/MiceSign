-- Add budget_enabled column to approval_template
ALTER TABLE approval_template ADD COLUMN budget_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Set budget_enabled = true for 4 financial templates
UPDATE approval_template SET budget_enabled = TRUE WHERE code IN ('EXPENSE', 'PURCHASE', 'BUSINESS_TRIP', 'OVERTIME');

-- Create budget_integration_log table
CREATE TABLE budget_integration_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT NOT NULL,
    template_code VARCHAR(20) NOT NULL,
    doc_number VARCHAR(30),
    event_type VARCHAR(20) NOT NULL COMMENT 'SUBMIT or CANCEL',
    status VARCHAR(20) NOT NULL COMMENT 'SUCCESS, FAILED',
    attempt_count INT NOT NULL DEFAULT 1,
    request_payload LONGTEXT COMMENT 'JSON request body sent to budget API',
    response_payload LONGTEXT COMMENT 'JSON response from budget API',
    error_message VARCHAR(1000),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    CONSTRAINT fk_budget_log_document FOREIGN KEY (document_id) REFERENCES document(id),
    INDEX idx_budget_log_document (document_id),
    INDEX idx_budget_log_status (status),
    INDEX idx_budget_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
