-- H2: notification_log 등록 알림 지원 확장
ALTER TABLE notification_log ALTER COLUMN recipient_id BIGINT NULL;
ALTER TABLE notification_log ALTER COLUMN recipient_email VARCHAR(150) NULL;
ALTER TABLE notification_log ADD COLUMN registration_request_id BIGINT NULL;
CREATE INDEX idx_notification_registration ON notification_log(registration_request_id);
