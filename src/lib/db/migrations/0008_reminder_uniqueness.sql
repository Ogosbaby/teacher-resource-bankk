-- Reminder uniqueness.
--
-- Reminders are queued by a scan that runs on a schedule, and pg-boss retries
-- jobs, so "have we already queued this one?" cannot be answered by reading the
-- table first and hoping nothing else wrote in between. The database has to be the
-- arbiter.
--
-- A total unique index on (subscription_id, type) is the right shape rather than a
-- partial one on unsent rows: a renewal reminder is a one-time event per
-- subscription, so a second one is a duplicate, not a follow-up. A partial index
-- would let the scan create a fresh reminder the day after the first was sent and
-- nag the teacher every day until they renewed.
--
-- subscription_id is nullable (the column is optional for other reminder types),
-- and NULLs never conflict in a unique index, so alternative reminders are
-- unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS reminder_queue_subscription_type_uq
  ON reminder_queue (subscription_id, type);
