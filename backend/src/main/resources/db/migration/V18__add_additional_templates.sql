-- ============================================
-- Phase 1-B 추가 결재 양식 (3 additional templates)
-- ============================================
INSERT IGNORE INTO approval_template (code, name, description, prefix, is_active, sort_order) VALUES
('PURCHASE', '구매 요청서', '물품 및 서비스 구매 요청 양식', 'PUR', TRUE, 4),
('BUSINESS_TRIP', '출장 보고서', '출장 신청 및 보고 양식', 'BTR', TRUE, 5),
('OVERTIME', '연장 근무 신청서', '연장 근무 신청 양식', 'OVT', TRUE, 6);
