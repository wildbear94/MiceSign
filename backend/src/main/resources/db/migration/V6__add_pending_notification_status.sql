-- Add PENDING status to notification_log status enum
ALTER TABLE notification_log MODIFY COLUMN status ENUM('PENDING','SUCCESS','FAILED','RETRY') NOT NULL;
