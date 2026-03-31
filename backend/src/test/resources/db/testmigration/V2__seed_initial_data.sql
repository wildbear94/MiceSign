-- ============================================
-- MiceSign Initial Seed Data (H2-compatible for testing)
-- ============================================

INSERT INTO department (id, name, parent_id, sort_order, is_active) VALUES
(1, '대표이사실', NULL, 1, TRUE),
(2, '경영지원부', 1, 2, TRUE),
(3, '인사부', 1, 3, TRUE),
(4, '개발부', 1, 4, TRUE),
(5, '영업부', 1, 5, TRUE),
(6, '마케팅부', 1, 6, TRUE),
(7, '재무부', 1, 7, TRUE);

INSERT INTO position (id, name, sort_order, is_active) VALUES
(1, '사원', 1, TRUE),
(2, '대리', 2, TRUE),
(3, '과장', 3, TRUE),
(4, '차장', 4, TRUE),
(5, '부장', 5, TRUE),
(6, '이사', 6, TRUE),
(7, '대표이사', 7, TRUE);

INSERT INTO "user" (employee_no, name, email, password, department_id, position_id, role, status)
VALUES ('ADMIN001', '시스템관리자', 'admin@micesign.com',
        '$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW',
        1, 7, 'SUPER_ADMIN', 'ACTIVE');

INSERT INTO approval_template (code, name, description, prefix, is_active, sort_order) VALUES
('GENERAL', '일반 업무 기안', '일반 업무에 대한 기안 양식', 'GEN', TRUE, 1),
('EXPENSE', '지출 결의서', '비용 지출에 대한 결의 양식', 'EXP', TRUE, 2),
('LEAVE', '휴가 신청서', '휴가 신청 양식', 'LVE', TRUE, 3);
