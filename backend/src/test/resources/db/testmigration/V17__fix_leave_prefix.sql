-- V17__fix_leave_prefix.sql
-- Fix LEAVE template prefix: LVE -> LEV (per Phase 6 D-23)
UPDATE approval_template SET prefix = 'LEV' WHERE code = 'LEAVE';
