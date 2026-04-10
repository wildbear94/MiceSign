-- ============================================
-- Registration Request table (H2-compatible)
-- ============================================
CREATE TABLE registration_request (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(50)   NOT NULL,
    email            VARCHAR(150)  NOT NULL,
    password_hash    VARCHAR(255)  NULL,
    tracking_token   VARCHAR(36)   NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    rejection_reason CLOB          NULL,
    approved_by      BIGINT        NULL,
    processed_at     DATETIME      NULL,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (approved_by) REFERENCES "user"(id)
);

CREATE INDEX idx_reg_email_status ON registration_request (email, status);
CREATE INDEX idx_reg_status ON registration_request (status);
CREATE INDEX idx_reg_created_at ON registration_request (created_at);
