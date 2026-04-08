-- ============================================
-- 등록 신청 추적 토큰 추가 (이메일 열거 방지)
-- password_hash nullable 변경 (승인 후 제거)
-- ============================================
ALTER TABLE registration_request
    ADD COLUMN tracking_token VARCHAR(36) NULL COMMENT '추적 토큰 (UUID)' AFTER password_hash;

-- Populate existing rows with UUIDs
UPDATE registration_request SET tracking_token = UUID() WHERE tracking_token IS NULL;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE registration_request
    MODIFY COLUMN tracking_token VARCHAR(36) NOT NULL COMMENT '추적 토큰 (UUID)',
    ADD UNIQUE INDEX uq_reg_tracking_token (tracking_token);

-- Make password_hash nullable (cleared after approval per WR-02)
ALTER TABLE registration_request
    MODIFY COLUMN password_hash VARCHAR(255) NULL COMMENT 'BCrypt 해시 (승인 후 제거)';
