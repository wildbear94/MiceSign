-- ============================================
-- MiceSign Database Schema (H2-compatible for testing)
-- Source: PRD_MiceSign_v2.0.md Section 11.2
-- ============================================

CREATE TABLE department (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    parent_id   BIGINT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES department(id)
);

CREATE TABLE position (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    sort_order  INT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "user" (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_no     VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(50) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    department_id   BIGINT NOT NULL,
    position_id     BIGINT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'USER',
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    phone           VARCHAR(20) NULL,
    profile_image   VARCHAR(500) NULL,
    last_login_at   DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES department(id),
    FOREIGN KEY (position_id) REFERENCES position(id)
);

CREATE TABLE approval_template (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500) NULL,
    prefix          VARCHAR(10) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doc_sequence (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_code   VARCHAR(20) NOT NULL,
    "year"          INT NOT NULL,
    last_sequence   INT NOT NULL DEFAULT 0,
    UNIQUE (template_code, "year")
);

CREATE TABLE document (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    doc_number      VARCHAR(30) NULL UNIQUE,
    template_code   VARCHAR(20) NOT NULL,
    title           VARCHAR(300) NOT NULL,
    drafter_id      BIGINT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    current_step    INT NULL,
    submitted_at    DATETIME NULL,
    completed_at    DATETIME NULL,
    source_doc_id   BIGINT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drafter_id) REFERENCES "user"(id),
    FOREIGN KEY (source_doc_id) REFERENCES document(id)
);

CREATE INDEX idx_drafter_status ON document(drafter_id, status);
CREATE INDEX idx_status ON document(status);
CREATE INDEX idx_template_code ON document(template_code);
CREATE INDEX idx_submitted_at ON document(submitted_at);

CREATE TABLE document_content (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id     BIGINT NOT NULL UNIQUE,
    body_html       CLOB NULL,
    form_data       CLOB NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id)
);

CREATE TABLE approval_line (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id     BIGINT NOT NULL,
    approver_id     BIGINT NOT NULL,
    line_type       VARCHAR(20) NOT NULL,
    step_order      INT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    comment         CLOB NULL,
    acted_at        DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id),
    FOREIGN KEY (approver_id) REFERENCES "user"(id)
);

CREATE INDEX idx_approver_status ON approval_line(approver_id, status);
CREATE INDEX idx_document_step ON approval_line(document_id, step_order);

CREATE TABLE document_attachment (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id     BIGINT NOT NULL,
    original_name   VARCHAR(500) NOT NULL,
    file_size       BIGINT NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    gdrive_file_id  VARCHAR(200) NOT NULL,
    gdrive_folder   VARCHAR(500) NULL,
    uploaded_by     BIGINT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id),
    FOREIGN KEY (uploaded_by) REFERENCES "user"(id)
);

CREATE INDEX idx_attachment_document ON document_attachment(document_id);

CREATE TABLE audit_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NULL,
    action          VARCHAR(50) NOT NULL,
    target_type     VARCHAR(50) NULL,
    target_id       BIGINT NULL,
    detail          TEXT NULL,
    ip_address      VARCHAR(50) NULL,
    user_agent      VARCHAR(500) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_action ON audit_log(user_id, action);
CREATE INDEX idx_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);

CREATE TABLE notification_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id    BIGINT NOT NULL,
    recipient_email VARCHAR(150) NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    document_id     BIGINT NULL,
    subject         VARCHAR(500) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    retry_count     INT NOT NULL DEFAULT 0,
    error_message   CLOB NULL,
    sent_at         DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES "user"(id)
);

CREATE INDEX idx_notification_document ON notification_log(document_id);
CREATE INDEX idx_notification_status ON notification_log(status);

CREATE TABLE refresh_token (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    device_info     VARCHAR(500) NULL,
    expires_at      DATETIME NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE INDEX idx_refresh_user ON refresh_token(user_id);
CREATE INDEX idx_refresh_expires ON refresh_token(expires_at);
