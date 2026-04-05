-- ============================================
-- 추가 결재 양식 3종 (Phase 10) - H2
-- ============================================
INSERT INTO approval_template (code, name, description, prefix, is_active, sort_order) VALUES
('PURCHASE', '구매 요청서', '물품 구매 요청 양식', 'PUR', TRUE, 4),
('BUSINESS_TRIP', '출장 보고서', '출장 결과 보고 양식', 'BTR', TRUE, 5),
('OVERTIME', '연장 근무 신청서', '연장 근무 신청 양식', 'OVT', TRUE, 6);
