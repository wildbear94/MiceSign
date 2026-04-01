-- ============================================
-- V3: Add authentication columns
-- ============================================

-- Add auth columns to user table
ALTER TABLE `user`
    ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0 COMMENT '연속 로그인 실패 횟수' AFTER profile_image,
    ADD COLUMN locked_until DATETIME NULL COMMENT '계정 잠금 해제 시각' AFTER failed_login_count,
    ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 COMMENT '비밀번호 변경 필요 여부' AFTER locked_until;

-- Fix stray position_id in refresh_token table (Pitfall 7 from RESEARCH.md)
ALTER TABLE refresh_token DROP FOREIGN KEY refresh_token_ibfk_2;
ALTER TABLE refresh_token DROP COLUMN position_id;

-- Force SUPER_ADMIN to change initial password
UPDATE `user` SET must_change_password = 1 WHERE role = 'SUPER_ADMIN';
