-- ---------------------------------------------------------------------------
-- 0011 — sales_agent role + webhook idempotency.
--
-- Kept as its own file on purpose: PostgreSQL will not let a newly added enum
-- value be *used* in the same transaction that adds it, and `scripts/migrate.ts`
-- sends a whole file as one implicit transaction. Applying this file separately
-- commits the value before 0012 references it.
-- ---------------------------------------------------------------------------

-- Internal operations get a narrower role than `admin`: a sales agent may
-- register customers, record payments and issue codes, but must not publish
-- course content. The internal LMS enforces that split.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_agent';

-- Paystack re-delivers webhooks. The provider's event id is the idempotency
-- key: the same event arriving twice must not create a second order, a second
-- entitlement or a second activation code.
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS provider_event_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_uq
  ON payment_events (provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;
