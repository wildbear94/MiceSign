-- ============================================
-- V11: 동적 양식 테스트 템플릿 시드 데이터
-- Phase 13: Dynamic Form Rendering 검증용
-- ============================================

INSERT INTO approval_template (code, name, description, prefix, is_active, sort_order, schema_definition, schema_version, is_custom, category)
VALUES (
  'DYNAMIC_TEST',
  '동적 양식 테스트',
  '모든 필드 타입을 포함하는 동적 양식 테스트',
  'DYN',
  TRUE,
  7,
  '{"version":1,"fields":[{"id":"subject","type":"text","label":"제목","required":true,"config":{"placeholder":"제목을 입력하세요","maxLength":100}},{"id":"description","type":"textarea","label":"상세 설명","required":false,"config":{"placeholder":"상세 내용을 입력하세요"}},{"id":"amount","type":"number","label":"금액","required":true,"config":{"min":0,"max":10000000,"unit":"원"}},{"id":"requestDate","type":"date","label":"요청일","required":true},{"id":"category","type":"select","label":"분류","required":true,"config":{"options":[{"value":"A","label":"카테고리 A","sortOrder":1},{"value":"B","label":"카테고리 B","sortOrder":2},{"value":"C","label":"카테고리 C","sortOrder":3}]}},{"id":"items","type":"table","label":"항목 목록","required":true,"config":{"minRows":1,"maxRows":10,"columns":[{"id":"name","type":"text","label":"항목명","required":true},{"id":"qty","type":"number","label":"수량","required":true,"config":{"min":1}},{"id":"price","type":"number","label":"단가","required":true,"config":{"min":0,"unit":"원"}}]}},{"id":"notice","type":"staticText","label":"","required":false,"config":{"content":"※ 위 항목을 모두 정확히 작성해주세요. 누락된 항목이 있을 경우 반려될 수 있습니다."}},{"id":"internalRef","type":"hidden","label":"내부참조","required":false,"config":{"defaultValue":"AUTO-REF"}}],"conditionalRules":[],"calculationRules":[]}',
  1,
  TRUE,
  '테스트'
);
