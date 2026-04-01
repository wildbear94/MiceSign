-- ============================================
-- V3: Add authentication columns (H2-compatible)
-- ============================================

-- Add auth columns to user table
ALTER TABLE "user" ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN locked_until DATETIME NULL;
ALTER TABLE "user" ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Force SUPER_ADMIN to change initial password
UPDATE "user" SET must_change_password = TRUE WHERE role = 'SUPER_ADMIN';
