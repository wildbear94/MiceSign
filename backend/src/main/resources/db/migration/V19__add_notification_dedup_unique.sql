-- notification_log 중복 발송 방지: document_id + event_type + recipient_id 조합 UNIQUE (D-A2/D-A3/D-A4)
-- document_id IS NULL인 행(registration emails — V14/V16 관련)은 MariaDB NULL 의미론상 중복 허용
-- (표준 SQL: NULL ≠ NULL in UNIQUE index → multiple rows with NULL document_id allowed)
-- 관련 엔티티 선언: NotificationLog.java @Table(uniqueConstraints = @UniqueConstraint(name = "uk_notification_dedup", ...))
-- ddl-auto=validate가 startup 시 엔티티 ↔ DB constraint 이름 drift를 자동 감지

ALTER TABLE notification_log
    ADD CONSTRAINT uk_notification_dedup
    UNIQUE (document_id, event_type, recipient_id);
