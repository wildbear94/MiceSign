-- ============================================
-- V9: 6개 레거시 템플릿 JSON 스키마 시드
-- 각 템플릿의 schema_definition과 schema_version을 설정
-- 기존 document_content 데이터는 변경하지 않음
-- ============================================

-- GENERAL (일반 업무 기안)
UPDATE approval_template
SET schema_definition = '{"version":1,"fields":[{"id":"title","type":"text","label":"제목","required":true,"config":{"maxLength":300,"placeholder":"제목을 입력하세요"}},{"id":"bodyText","type":"textarea","label":"내용","required":true,"config":{"placeholder":"내용을 입력하세요"}}],"conditionalRules":[],"calculationRules":[]}',
    schema_version = 1
WHERE code = 'GENERAL';

-- EXPENSE (지출 결의서)
UPDATE approval_template
SET schema_definition = '{"version":1,"fields":[{"id":"items","type":"table","label":"지출 항목","required":true,"config":{"minRows":1,"maxRows":20,"columns":[{"id":"name","type":"text","label":"항목명","required":true},{"id":"quantity","type":"number","label":"수량","required":true,"config":{"min":1}},{"id":"unitPrice","type":"number","label":"단가","required":true,"config":{"min":0,"unit":"원"}},{"id":"amount","type":"number","label":"금액","required":true,"config":{"min":0,"unit":"원"}}]}},{"id":"totalAmount","type":"number","label":"총액","required":true,"config":{"min":0,"unit":"원"}},{"id":"paymentMethod","type":"text","label":"결제 수단","required":false,"config":{"placeholder":"결제 수단"}},{"id":"accountInfo","type":"text","label":"계좌/카드 정보","required":false,"config":{"placeholder":"계좌/카드 정보"}}],"conditionalRules":[],"calculationRules":[{"targetFieldId":"totalAmount","operation":"SUM","sourceFields":["items.amount"]}]}',
    schema_version = 1
WHERE code = 'EXPENSE';

-- LEAVE (휴가 신청서)
UPDATE approval_template
SET schema_definition = '{"version":1,"fields":[{"id":"leaveType","type":"select","label":"휴가 유형","required":true,"config":{"options":[{"value":"ANNUAL","label":"연차","sortOrder":1},{"value":"HALF_AM","label":"오전반차","sortOrder":2},{"value":"HALF_PM","label":"오후반차","sortOrder":3},{"value":"SICK","label":"병가","sortOrder":4},{"value":"FAMILY","label":"경조","sortOrder":5}]}},{"id":"startDate","type":"date","label":"시작일","required":true,"config":{}},{"id":"endDate","type":"date","label":"종료일","required":false,"config":{}},{"id":"startTime","type":"text","label":"시작 시간","required":false,"config":{"placeholder":"HH:mm"}},{"id":"endTime","type":"text","label":"종료 시간","required":false,"config":{"placeholder":"HH:mm"}},{"id":"days","type":"number","label":"사용일수","required":true,"config":{"min":0}},{"id":"reason","type":"textarea","label":"사유","required":true,"config":{"placeholder":"사유를 입력하세요","maxLength":500}},{"id":"emergencyContact","type":"text","label":"비상 연락처","required":false,"config":{"placeholder":"비상 연락처"}}],"conditionalRules":[{"targetFieldId":"endDate","action":"show","conditions":[{"sourceFieldId":"leaveType","operator":"notIn","value":["HALF_AM","HALF_PM"]}]},{"targetFieldId":"startTime","action":"show","conditions":[{"sourceFieldId":"leaveType","operator":"in","value":["HALF_AM","HALF_PM"]}]},{"targetFieldId":"endTime","action":"show","conditions":[{"sourceFieldId":"leaveType","operator":"in","value":["HALF_AM","HALF_PM"]}]}],"calculationRules":[]}',
    schema_version = 1
WHERE code = 'LEAVE';

-- PURCHASE (구매 요청서)
UPDATE approval_template
SET schema_definition = '{"version":1,"fields":[{"id":"purpose","type":"textarea","label":"구매 목적","required":true,"config":{"placeholder":"구매 목적","maxLength":500}},{"id":"items","type":"table","label":"구매 항목","required":true,"config":{"minRows":1,"maxRows":20,"columns":[{"id":"name","type":"text","label":"품목명","required":true},{"id":"spec","type":"text","label":"규격","required":false},{"id":"quantity","type":"number","label":"수량","required":true,"config":{"min":1}},{"id":"unitPrice","type":"number","label":"단가","required":true,"config":{"min":0,"unit":"원"}},{"id":"amount","type":"number","label":"금액","required":true,"config":{"min":0,"unit":"원"}}]}},{"id":"totalAmount","type":"number","label":"총액","required":true,"config":{"min":0,"unit":"원"}},{"id":"deliveryDate","type":"date","label":"납품 희망일","required":false,"config":{}},{"id":"supplier","type":"text","label":"공급업체","required":false,"config":{"placeholder":"공급업체","maxLength":200}}],"conditionalRules":[],"calculationRules":[{"targetFieldId":"totalAmount","operation":"SUM","sourceFields":["items.amount"]}]}',
    schema_version = 1
WHERE code = 'PURCHASE';

-- BUSINESS_TRIP (출장 신청서)
UPDATE approval_template
SET schema_definition = '{"version":1,"fields":[{"id":"destination","type":"text","label":"출장지","required":true,"config":{"placeholder":"출장지","maxLength":200}},{"id":"startDate","type":"date","label":"시작일","required":true,"config":{}},{"id":"endDate","type":"date","label":"종료일","required":true,"config":{}},{"id":"purpose","type":"textarea","label":"출장 목적","required":true,"config":{"placeholder":"출장 목적","maxLength":500}},{"id":"itinerary","type":"table","label":"일정","required":false,"config":{"minRows":0,"maxRows":20,"columns":[{"id":"date","type":"text","label":"일자","required":true},{"id":"location","type":"text","label":"장소","required":true},{"id":"activity","type":"text","label":"활동 내용","required":true}]}},{"id":"expenses","type":"table","label":"경비","required":false,"config":{"minRows":0,"maxRows":20,"columns":[{"id":"item","type":"text","label":"항목","required":true},{"id":"amount","type":"number","label":"금액","required":true,"config":{"min":0,"unit":"원"}}]}},{"id":"totalExpense","type":"number","label":"총 경비","required":false,"config":{"min":0,"unit":"원"}},{"id":"report","type":"textarea","label":"출장 결과","required":false,"config":{"placeholder":"출장 결과","maxLength":2000}}],"conditionalRules":[],"calculationRules":[{"targetFieldId":"totalExpense","operation":"SUM","sourceFields":["expenses.amount"]}]}',
    schema_version = 1
WHERE code = 'BUSINESS_TRIP';

-- OVERTIME (연장 근무 신청서)
UPDATE approval_template
SET schema_definition = '{"version":1,"fields":[{"id":"workDate","type":"date","label":"근무일","required":true,"config":{}},{"id":"startTime","type":"text","label":"시작 시간","required":true,"config":{"placeholder":"HH:mm (예: 18:00)"}},{"id":"endTime","type":"text","label":"종료 시간","required":true,"config":{"placeholder":"HH:mm (예: 21:00)"}},{"id":"hours","type":"number","label":"근무 시간","required":true,"config":{"min":0.5,"max":12}},{"id":"reason","type":"textarea","label":"사유","required":true,"config":{"placeholder":"연장 근무 사유","maxLength":500}},{"id":"managerName","type":"text","label":"담당 관리자","required":false,"config":{"placeholder":"담당 관리자"}}],"conditionalRules":[],"calculationRules":[]}',
    schema_version = 1
WHERE code = 'OVERTIME';
