-- ============================================
-- V5: 휴가 유형 테이블 생성 + 양식/휴가 시드 데이터
-- ============================================

-- 휴가 유형
CREATE TABLE leave_type (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE COMMENT '휴가 유형 코드',
    name        VARCHAR(50) NOT NULL COMMENT '휴가 유형명',
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE COMMENT '반차 여부',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='휴가 유형';

-- 휴가 유형 시드
INSERT INTO leave_type (code, name, is_half_day, sort_order) VALUES
('ANNUAL', '연차', FALSE, 1),
('HALF_DAY', '반차', TRUE, 2),
('SICK', '병가', FALSE, 3),
('FAMILY', '경조', FALSE, 4);

-- 결재 양식 시드
INSERT INTO approval_template (code, name, description, prefix, sort_order) VALUES
('GENERAL', '일반 업무 기안', '일반적인 업무 기안 및 보고에 사용합니다.', 'GEN', 1),
('EXPENSE', '지출 결의서', '지출 내역을 보고하고 승인을 요청합니다.', 'EXP', 2),
('LEAVE', '휴가 신청서', '휴가를 신청합니다.', 'LEV', 3);
