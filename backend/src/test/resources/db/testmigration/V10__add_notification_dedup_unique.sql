-- notification_log 중복 발송 방지 (V19 MariaDB migration의 H2 test mirror — D-A2/D-A3/D-A4)
-- H2 dialect도 MariaDB와 동일 ALTER TABLE ... ADD CONSTRAINT ... UNIQUE (...) 지원
-- (표준 SQL: NULL ≠ NULL in UNIQUE index → multiple rows with NULL document_id allowed)
-- V8 (add_missing_template_columns) 이후 V10 — V9 gap은 Flyway 기본 동작상 허용
-- 관련 엔티티 선언: NotificationLog.java @Table(uniqueConstraints = @UniqueConstraint(name = "uk_notification_dedup", ...))

ALTER TABLE notification_log
    ADD CONSTRAINT uk_notification_dedup
    UNIQUE (document_id, event_type, recipient_id);
