-- ============================================
-- 사용자 등록 신청
-- ============================================
CREATE TABLE registration_request (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(50)   NOT NULL COMMENT '신청자 이름',
    email            VARCHAR(150)  NOT NULL COMMENT '신청자 이메일',
    password_hash    VARCHAR(255)  NOT NULL COMMENT 'BCrypt 해시',
    status           ENUM('PENDING','APPROVED','REJECTED','CANCELLED','EXPIRED')
                     NOT NULL DEFAULT 'PENDING' COMMENT '신청 상태',
    rejection_reason TEXT          NULL COMMENT '거부 사유',
    approved_by      BIGINT        NULL COMMENT '승인/거부 처리자',
    processed_at     DATETIME      NULL COMMENT '승인/거부 처리 시간',
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (approved_by) REFERENCES `user`(id),
    INDEX idx_reg_email_status (email, status),
    INDEX idx_reg_status (status),
    INDEX idx_reg_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자 등록 신청';
