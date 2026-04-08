-- notification_log: 등록 알림 지원 확장
-- FK 이름 확인: SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_log'
--   AND CONSTRAINT_TYPE = 'FOREIGN KEY';
-- V1 DDL에서 FK 순서: recipient_id만 존재 -> notification_log_ibfk_1

-- recipient_id를 nullable로 변경 (미등록 신청자는 user가 아님)
ALTER TABLE notification_log DROP FOREIGN KEY notification_log_ibfk_1;
ALTER TABLE notification_log MODIFY recipient_id BIGINT NULL;
ALTER TABLE notification_log ADD CONSTRAINT fk_notification_log_recipient
    FOREIGN KEY (recipient_id) REFERENCES `user`(id);

-- recipient_email도 nullable로 변경
ALTER TABLE notification_log MODIFY recipient_email VARCHAR(150) NULL;

-- registration_request_id 컬럼 추가
ALTER TABLE notification_log ADD COLUMN registration_request_id BIGINT NULL
    AFTER document_id;
ALTER TABLE notification_log ADD INDEX idx_notification_registration (registration_request_id);
