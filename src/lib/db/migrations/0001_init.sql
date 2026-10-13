CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE user_role AS ENUM ('teacher', 'admin');
CREATE TYPE content_status AS ENUM ('draft', 'in_review', 'published', 'archived');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE module_content_type AS ENUM ('video', 'text', 'quiz', 'resource', 'external_link');
CREATE TYPE resource_type AS ENUM ('lesson_plan', 'worksheet', 'template', 'other');
CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE embedding_source_type AS ENUM ('resource', 'help');
CREATE TYPE reminder_type AS ENUM ('renewal_reminder', 'payment_failed', 'payment_success');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  billing_contact_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'teacher',
  admin_permissions TEXT[] NOT NULL DEFAULT '{}',
  organization_id UUID REFERENCES organizations(id),
  email_verified_at TIMESTAMPTZ,
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at BIGINT,
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year VARCHAR(20) NOT NULL,
  term_number SMALLINT NOT NULL CHECK (term_number IN (1,2,3)),
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academic_year, term_number)
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  term_id UUID NOT NULL REFERENCES terms(id),
  organization_id UUID REFERENCES organizations(id),
  amount_kobo INTEGER NOT NULL DEFAULT 500000,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  paystack_reference VARCHAR(255) UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, term_id)
);
CREATE INDEX idx_subscriptions_user_expiry ON subscriptions (user_id, expires_at);
CREATE INDEX idx_subscriptions_status ON subscriptions (payment_status);

CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  provider VARCHAR(50) NOT NULL DEFAULT 'paystack',
  event_type VARCHAR(100) NOT NULL,
  raw_payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE reminder_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  type reminder_type NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reminder_pending ON reminder_queue (scheduled_for) WHERE sent_at IS NULL;

CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  cover_image_url VARCHAR(500),
  status content_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  cover_image_url VARCHAR(500),
  estimated_duration_minutes INTEGER,
  status content_status NOT NULL DEFAULT 'draft',
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_model_version VARCHAR(100),
  generation_prompt TEXT,
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learning_path_courses (
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (path_id, course_id)
);

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  resource_type resource_type NOT NULL,
  subject VARCHAR(100),
  grade_level VARCHAR(50),
  tags TEXT[] NOT NULL DEFAULT '{}',
  file_storage_key VARCHAR(500) NOT NULL,
  file_type VARCHAR(20),
  status content_status NOT NULL DEFAULT 'draft',
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  ai_model_version VARCHAR(100),
  generation_prompt TEXT,
  content_hash VARCHAR(64),
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resources_status ON resources (status);
CREATE INDEX idx_resources_tags ON resources USING GIN (tags);

CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  sequence_order INTEGER NOT NULL,
  content_type module_content_type NOT NULL,
  body TEXT,
  video_url VARCHAR(500),
  resource_id UUID REFERENCES resources(id),
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, sequence_order)
);

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  status enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

CREATE TABLE module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  UNIQUE (enrollment_id, module_id)
);

CREATE TABLE path_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  path_id UUID NOT NULL REFERENCES learning_paths(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, path_id)
);

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  learning_path_id UUID REFERENCES learning_paths(id),
  title_snapshot VARCHAR(255) NOT NULL,
  recipient_name_snapshot VARCHAR(255) NOT NULL,
  completion_date DATE NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exactly_one_target CHECK (
    (course_id IS NOT NULL AND learning_path_id IS NULL) OR
    (course_id IS NULL AND learning_path_id IS NOT NULL)
  )
);
CREATE INDEX idx_certificates_user ON certificates (user_id);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  content TEXT NOT NULL,
  source_type_used embedding_source_type,
  retrieved_chunk_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WARNING: VECTOR(1024) must match your real embedding model dimension.
CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type embedding_source_type NOT NULL,
  source_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1024) NOT NULL,
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embeddings_resource_hnsw ON content_embeddings
  USING hnsw (embedding vector_cosine_ops) WHERE source_type = 'resource';
CREATE INDEX idx_embeddings_help_hnsw ON content_embeddings
  USING hnsw (embedding vector_cosine_ops) WHERE source_type = 'help';
CREATE INDEX idx_embeddings_source ON content_embeddings (source_type, source_id);

CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(100),
  status content_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kb_route_exemplars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type embedding_source_type NOT NULL,
  example_question TEXT NOT NULL,
  embedding VECTOR(1024) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
