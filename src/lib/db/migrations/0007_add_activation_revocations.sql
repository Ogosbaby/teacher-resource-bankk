-- Per-code revocation.
--
-- An activation code grants entitlement entirely offline: the app validates it
-- against a signed list baked into the bundle, so a code keeps working on a
-- device that never sees the network again. Rotating the batch is the only way
-- to remove a code from that list, and it only takes effect when a new build is
-- installed. That leaves no way to kill a single code that has already been
-- redeemed — a refunded or leaked code stays valid on the phone holding it.
--
-- This table is the server's record of those kills, and it is the source of
-- truth they are all regenerated from:
--
--   1. The sync route reports the list to every device that checks in, so an
--      online device learns about a revocation that postdates its build.
--   2. `npm run codes:revoke` folds the same list into the signed batch the app
--      ships with, so an offline device honours it too.
--
-- A revoked code is never deleted here: revocation is monotonic, and the row is
-- the audit trail for why a teacher lost access.
CREATE TABLE IF NOT EXISTS activation_revocations (
  code VARCHAR(32) PRIMARY KEY,
  reason TEXT NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Nullable on purpose: a revocation is normally applied by an operator running
  -- the script, with no signed-in admin behind it.
  revoked_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS activation_revocations_revoked_at_idx
  ON activation_revocations (revoked_at DESC);
