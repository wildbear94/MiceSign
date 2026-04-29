-- Phase 34 Plan 03 — align test schema with production
--
-- Production V1 (backend/src/main/resources/db/migration/V1__create_schema.sql L48)
-- declares `user.position_id BIGINT NULL` to allow users without an assigned
-- position. The test H2 schema (testmigration/V1__create_schema.sql L33)
-- accidentally declared it `BIGINT NOT NULL`, which prevented integration tests
-- from exercising the null-position branch covered by D-C4 (drafterSnapshot
-- emits `positionName: null` when User.positionId is null).
--
-- Drop the NOT NULL constraint so D-C4 behavior can be tested under the same
-- shape as production.

ALTER TABLE "user" ALTER COLUMN position_id BIGINT NULL;
