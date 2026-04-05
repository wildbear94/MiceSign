-- ============================================
-- V10: 옵션 셋/항목 테이블 (H2)
-- ============================================

CREATE TABLE option_set (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_option_set_name UNIQUE (name)
);

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
);
