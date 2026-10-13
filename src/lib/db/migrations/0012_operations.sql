-- ---------------------------------------------------------------------------
-- 0012 — internal operations: customers, agents, orders, activation codes,
--        device bindings, app release manifest and content packages.
--
-- This is the server-side half of the product architecture. The website is an
-- internal LMS + operations platform; customers buy a term, receive an
-- activation code by email, install the app, and the app redeems that code
-- against these tables. Nothing here trusts a client-supplied price, duration,
-- expiry date or payment result.
-- ---------------------------------------------------------------------------

-- ── Order lifecycle (distinct from payment_status, which is per-subscription) ─
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Activation-code lifecycle ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE activation_code_status AS ENUM (
    'created', 'issued', 'redeemed', 'active', 'expired', 'revoked', 'suspended', 'replaced'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_channel AS ENUM ('email', 'agent', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('queued', 'sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Devices ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE device_platform AS ENUM ('android', 'windows', 'web', 'ios', 'unsupported');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE device_status AS ENUM ('active', 'revoked', 'replaced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── App releases ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE release_platform AS ENUM ('android', 'windows');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE release_status AS ENUM ('draft', 'published', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE agent_status AS ENUM ('active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Sales agents ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40),
  region VARCHAR(120),
  status agent_status NOT NULL DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_agents_email_uq ON sales_agents (lower(email));
CREATE INDEX IF NOT EXISTS sales_agents_user_idx ON sales_agents (user_id);

-- ── Customers ───────────────────────────────────────────────────────────────
-- A customer is the buyer the order and code belong to. It is deliberately its
-- own row rather than just a `users` row: a sales agent registers people who
-- may never create a website account, and the code still has to be attributable.
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40),
  state VARCHAR(80),
  school_name VARCHAR(255),
  note TEXT,
  created_by_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_uq ON customers (lower(email));
CREATE INDEX IF NOT EXISTS customers_agent_idx ON customers (created_by_agent_id);
CREATE INDEX IF NOT EXISTS customers_user_idx ON customers (user_id);

-- ── Orders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(64) NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'paystack',
  provider_reference VARCHAR(255),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_kobo INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  status order_status NOT NULL DEFAULT 'pending',
  source VARCHAR(20) NOT NULL DEFAULT 'website',
  authorization_url VARCHAR(500),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_reference_uq ON orders (reference);
CREATE UNIQUE INDEX IF NOT EXISTS orders_provider_reference_uq
  ON orders (provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_agent_idx ON orders (sales_agent_id);

-- ── Activation codes ────────────────────────────────────────────────────────
-- The audit trail the spec asks for: every field is a column, not a JSON blob,
-- so a support question ("who issued this, when was it redeemed, on what
-- device, and was it revoked?") is a query rather than an archaeology dig.
CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL,
  code_version INTEGER NOT NULL DEFAULT 1,
  status activation_code_status NOT NULL DEFAULT 'created',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  duration_months SMALLINT NOT NULL DEFAULT 3,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  bound_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bound_device_id VARCHAR(64),
  delivery_channel delivery_channel NOT NULL DEFAULT 'email',
  delivery_status delivery_status NOT NULL DEFAULT 'queued',
  delivery_attempts INTEGER NOT NULL DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  delivery_error TEXT,
  delivered_to VARCHAR(255),
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  replaced_by_id UUID REFERENCES activation_codes(id) ON DELETE SET NULL,
  schema_version INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS activation_codes_code_uq ON activation_codes (code);
CREATE INDEX IF NOT EXISTS activation_codes_status_idx ON activation_codes (status);
CREATE INDEX IF NOT EXISTS activation_codes_customer_idx ON activation_codes (customer_id);
CREATE INDEX IF NOT EXISTS activation_codes_agent_idx ON activation_codes (sales_agent_id);
CREATE INDEX IF NOT EXISTS activation_codes_order_idx ON activation_codes (order_id);
CREATE INDEX IF NOT EXISTS activation_codes_device_idx ON activation_codes (bound_device_id);
CREATE INDEX IF NOT EXISTS activation_codes_expires_idx ON activation_codes (expires_at);

-- ── Devices ─────────────────────────────────────────────────────────────────
-- `device_id` is the opaque UUID the app generates on first install. The server
-- never sees how it was made and the client cannot rewrite it: a code bound to
-- one install is refused on another.
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(64) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  activation_code_id UUID REFERENCES activation_codes(id) ON DELETE SET NULL,
  platform device_platform NOT NULL DEFAULT 'unsupported',
  device_model VARCHAR(160),
  os_version VARCHAR(60),
  app_version VARCHAR(40),
  status device_status NOT NULL DEFAULT 'active',
  bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_validated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS devices_device_id_uq ON devices (device_id);
CREATE INDEX IF NOT EXISTS devices_user_idx ON devices (user_id);
CREATE INDEX IF NOT EXISTS devices_status_idx ON devices (status);

-- "One device per user" — enforced as one *active* binding per account. A
-- replaced device is moved to `replaced` first, which is what lets a support
-- agent move a teacher to a new phone without weakening the rule.
CREATE UNIQUE INDEX IF NOT EXISTS devices_one_active_per_user_uq
  ON devices (user_id)
  WHERE status = 'active' AND user_id IS NOT NULL;

-- ── Content packages ────────────────────────────────────────────────────────
-- Released, versioned bundles of approved course content. The app syncs a
-- package rather than the draft workspace, so nothing half-finished can reach a
-- customer device.
CREATE TABLE IF NOT EXISTS content_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  checksum VARCHAR(64),
  course_count INTEGER NOT NULL DEFAULT 0,
  module_count INTEGER NOT NULL DEFAULT 0,
  release_notes TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS content_packages_version_uq ON content_packages (version);
CREATE INDEX IF NOT EXISTS content_packages_status_idx ON content_packages (status);

-- Course content versioning: the app compares versions to decide what to pull.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS content_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES content_packages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS courses_package_idx ON courses (package_id);

-- ── App releases ────────────────────────────────────────────────────────────
-- The download page reads this. Nothing is hard-coded: a release that is not
-- `published` is not offered, and a checksum is required so an installer can be
-- verified after download.
CREATE TABLE IF NOT EXISTS app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform release_platform NOT NULL,
  architecture VARCHAR(40) NOT NULL DEFAULT 'universal',
  version VARCHAR(40) NOT NULL,
  build_number INTEGER NOT NULL DEFAULT 1,
  download_url VARCHAR(500) NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  file_size_bytes BIGINT,
  release_date DATE NOT NULL,
  min_supported_version VARCHAR(40),
  status release_status NOT NULL DEFAULT 'draft',
  release_notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_releases_platform_version_arch_uq
  ON app_releases (platform, version, architecture);
CREATE INDEX IF NOT EXISTS app_releases_status_idx ON app_releases (status);
