-- ============================================
-- V10: 옵션 셋/항목 테이블 (select 필드 지원)
-- Phase 12: 공유 옵션 목록 관리
-- ============================================

CREATE TABLE option_set (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_option_set_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE option_item (
  id BIGINT NOT NULL AUTO_INCREMENT,
  option_set_id BIGINT NOT NULL,
  value VARCHAR(100) NOT NULL,
  label VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  CONSTRAINT fk_option_item_set FOREIGN KEY (option_set_id)
    REFERENCES option_set(id) ON DELETE CASCADE,
  CONSTRAINT uk_option_item_value UNIQUE (option_set_id, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
