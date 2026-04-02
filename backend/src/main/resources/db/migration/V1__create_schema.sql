-- ============================================
-- MiceSign Database Schema
-- Source: PRD_MiceSign_v2.0.md Section 11.2
-- ============================================

-- ============================================
-- 부서
-- ============================================
CREATE TABLE department (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL COMMENT '부서명',
    parent_id   BIGINT NULL COMMENT '상위 부서 ID (NULL이면 최상위)',
    sort_order  INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES department(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='부서';

-- ============================================
-- 직급
-- ============================================
CREATE TABLE `position`
(
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(50) NOT NULL COMMENT '직급명',
    sort_order INT         NOT NULL COMMENT '서열 순서 (낮을수록 하위)',
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
    COMMENT ='직급';

-- ============================================
-- 사용자
-- ============================================
CREATE TABLE `user`
(
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_no   VARCHAR(20)                          NOT NULL UNIQUE COMMENT '사번',
    name          VARCHAR(50)                          NOT NULL COMMENT '이름',
    email         VARCHAR(150)                         NOT NULL UNIQUE COMMENT '이메일 (로그인 ID)',
    password      VARCHAR(255)                         NOT NULL COMMENT 'BCrypt 해시',
    department_id BIGINT                               NOT NULL,
    position_id   BIGINT                               NULL,
    role          ENUM ('SUPER_ADMIN','ADMIN','USER')  NOT NULL DEFAULT 'USER',
    status        ENUM ('ACTIVE','INACTIVE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
    phone         VARCHAR(20)                          NULL,
    profile_image VARCHAR(500)                         NULL COMMENT '프로필 이미지 URL',
    last_login_at DATETIME                             NULL,
    created_at    DATETIME                             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME                             NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES department (id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES `position` (id) ON DELETE SET NULL
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
    COMMENT ='사용자';

-- ============================================
-- 결재 양식 마스터
-- ============================================
CREATE TABLE approval_template (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE COMMENT '양식 코드 (GENERAL, EXPENSE, LEAVE 등)',
    name            VARCHAR(100) NOT NULL COMMENT '양식명',
    description     VARCHAR(500) NULL COMMENT '양식 설명',
    prefix          VARCHAR(10) NOT NULL COMMENT '채번 접두사',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='결재 양식 마스터';

-- ============================================
-- 채번 시퀀스
-- ============================================
CREATE TABLE doc_sequence (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_code   VARCHAR(20) NOT NULL COMMENT '양식 코드',
    year            INT NOT NULL COMMENT '연도',
    last_sequence   INT NOT NULL DEFAULT 0 COMMENT '마지막 발급 시퀀스',
    UNIQUE KEY uk_template_year (template_code, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='채번 시퀀스';

-- ============================================
-- 결재 문서 (메인)
-- ============================================
CREATE TABLE document
(
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    doc_number    VARCHAR(30)  NULL UNIQUE COMMENT '문서번호 (상신 시 채번, DRAFT는 NULL)',
    template_code VARCHAR(20)  NOT NULL COMMENT '양식 코드',
    title         VARCHAR(300) NOT NULL COMMENT '문서 제목',
    drafter_id    BIGINT       NOT NULL COMMENT '기안자 ID',
    status        ENUM ('DRAFT','SUBMITTED','APPROVED','REJECTED','WITHDRAWN')
                               NOT NULL DEFAULT 'DRAFT',
    current_step  INT          NULL COMMENT '현재 결재 단계 (step_order)',
    submitted_at  DATETIME     NULL COMMENT '상신 일시',
    completed_at  DATETIME     NULL COMMENT '최종 처리 일시 (승인/반려/회수)',
    source_doc_id BIGINT       NULL COMMENT '재기안 원본 문서 ID (추적용)',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (drafter_id) REFERENCES `user` (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (source_doc_id) REFERENCES document (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_drafter_status (drafter_id, status),
    INDEX idx_status (status),
    INDEX idx_template_code (template_code),
    INDEX idx_submitted_at (submitted_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
    COMMENT ='결재 문서';

-- ============================================
-- 문서 본문 / 양식별 데이터
-- ============================================
CREATE TABLE document_content (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id     BIGINT NOT NULL UNIQUE COMMENT '문서 ID (1:1)',
    body_html       LONGTEXT NULL COMMENT '본문 (Rich Text HTML) - GENERAL 양식용',
    form_data       JSON NULL COMMENT '양식별 구조화 데이터 (JSON)',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='문서 본문 및 양식 데이터';

-- ============================================
-- 결재선
-- ============================================
CREATE TABLE approval_line (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id     BIGINT NOT NULL,
    approver_id     BIGINT NOT NULL COMMENT '결재/합의/참조자 ID',
    line_type       ENUM('APPROVE','AGREE','REFERENCE') NOT NULL COMMENT '결재선 유형',
    step_order      INT NOT NULL COMMENT '결재 순서 (REFERENCE는 0)',
    status          ENUM('PENDING','APPROVED','REJECTED','SKIPPED')
                    NOT NULL DEFAULT 'PENDING',
    comment         TEXT NULL COMMENT '결재 의견',
    acted_at        DATETIME NULL COMMENT '처리 일시',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id),
    FOREIGN KEY (approver_id) REFERENCES `user`(id),
    INDEX idx_approver_status (approver_id, status),
    INDEX idx_document_step (document_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='결재선';

-- ============================================
-- 첨부파일 메타데이터
-- ============================================
CREATE TABLE document_attachment (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id     BIGINT NOT NULL,
    original_name   VARCHAR(500) NOT NULL COMMENT '원본 파일명',
    file_size       BIGINT NOT NULL COMMENT '파일 크기 (bytes)',
    mime_type       VARCHAR(100) NOT NULL,
    gdrive_file_id  VARCHAR(200) NOT NULL COMMENT 'Google Drive File ID',
    gdrive_folder   VARCHAR(500) NULL COMMENT 'Google Drive 폴더 경로',
    uploaded_by     BIGINT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id),
    FOREIGN KEY (uploaded_by) REFERENCES `user`(id),
    INDEX idx_document (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='첨부파일 메타데이터';

-- ============================================
-- 감사 로그 (불변)
-- ============================================
CREATE TABLE audit_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NULL COMMENT '액션 수행자 (시스템 액션은 NULL)',
    action          VARCHAR(50) NOT NULL COMMENT '액션 코드',
    target_type     VARCHAR(50) NULL COMMENT '대상 엔티티 (DOCUMENT, USER 등)',
    target_id       BIGINT NULL COMMENT '대상 엔티티 ID',
    detail          JSON NULL COMMENT '상세 정보 (변경 전/후 등)',
    ip_address      VARCHAR(50) NULL,
    user_agent      VARCHAR(500) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action),
    INDEX idx_target (target_type, target_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='감사 로그';

-- ============================================
-- 알림 발송 이력
-- ============================================
CREATE TABLE notification_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id    BIGINT NOT NULL COMMENT '수신자 ID',
    recipient_email VARCHAR(150) NOT NULL,
    event_type      VARCHAR(50) NOT NULL COMMENT '이벤트 유형 (SUBMIT, APPROVE 등)',
    document_id     BIGINT NULL,
    subject         VARCHAR(500) NOT NULL COMMENT '메일 제목',
    status          ENUM('SUCCESS','FAILED','RETRY') NOT NULL,
    retry_count     INT NOT NULL DEFAULT 0,
    error_message   TEXT NULL,
    sent_at         DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES `user`(id),
    INDEX idx_document (document_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='알림 발송 이력';

-- ============================================
-- Refresh Token 저장소
-- ============================================
CREATE TABLE refresh_token (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    token_hash      VARCHAR(255) NOT NULL UNIQUE COMMENT 'SHA-256 해시',
    position_id BIGINT NULL, -- NOT NULL -> NULL로 변경
    device_info     VARCHAR(500) NULL COMMENT '디바이스 정보',
    expires_at      DATETIME NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES `user`(id),
    FOREIGN KEY (position_id) REFERENCES `position` (id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Refresh Token';
