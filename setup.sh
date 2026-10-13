#!/usr/bin/env bash
set -e

ROOT="teacher-resource-bank"
echo "Scaffolding $ROOT (no route groups, no parentheses anywhere) ..."

mkdir -p "$ROOT/src/app"
mkdir -p "$ROOT/src/app/pricing"
mkdir -p "$ROOT/src/app/sign-in"
mkdir -p "$ROOT/src/app/sign-up"
mkdir -p "$ROOT/src/app/dashboard/billing"
mkdir -p "$ROOT/src/app/dashboard/certificates"
mkdir -p "$ROOT/src/app/dashboard/learn/courses"
mkdir -p "$ROOT/src/app/dashboard/learn/paths"
mkdir -p "$ROOT/src/app/dashboard/learn/resources"
mkdir -p "$ROOT/src/app/dashboard/learn/chat"
mkdir -p "$ROOT/src/app/admin/dashboard"
mkdir -p "$ROOT/src/app/admin/courses"
mkdir -p "$ROOT/src/app/admin/paths"
mkdir -p "$ROOT/src/app/admin/resources"
mkdir -p "$ROOT/src/app/admin/users"
mkdir -p "$ROOT/src/app/admin/terms"
mkdir -p "$ROOT/src/app/admin/subscriptions"
mkdir -p "$ROOT/src/app/admin/kb"
mkdir -p "$ROOT/src/app/api/auth/register"
mkdir -p "$ROOT/src/app/api/auth/[...nextauth]"

mkdir -p "$ROOT/src/components/ui"
mkdir -p "$ROOT/src/components/layout"
mkdir -p "$ROOT/src/lib/auth"
mkdir -p "$ROOT/src/lib/db/migrations"
mkdir -p "$ROOT/src/lib/services"
mkdir -p "$ROOT/src/lib/utils"
mkdir -p "$ROOT/src/types"
mkdir -p "$ROOT/src/workers"
mkdir -p "$ROOT/scripts"

# ---------------------------------------------------------------------------
# root config
# ---------------------------------------------------------------------------

cat > "$ROOT/package.json" << 'EOF'
{
  "name": "teacher-resource-bank",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "worker": "tsx src/workers/index.ts",
    "seed": "tsx scripts/seed.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "next-auth": "5.0.0-beta.20",
    "drizzle-orm": "^0.31.0",
    "pg": "^8.12.0",
    "pg-boss": "^9.0.3",
    "bcryptjs": "^2.4.3",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "zod": "^3.23.8",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "drizzle-kit": "^0.22.0",
    "tsx": "^4.16.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/pg": "^8.11.0",
    "@types/bcryptjs": "^2.4.6"
  }
}
EOF

cat > "$ROOT/.env.example" << 'EOF'
DATABASE_URL=postgres://postgres:postgres@localhost:5432/trb
AUTH_SECRET=replace-with-a-generated-random-string

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

ADMIN_EMAIL=admin@trb.local
ADMIN_PASSWORD=ChangeMe123!
EOF

cat > "$ROOT/.gitignore" << 'EOF'
node_modules/
.next/
.env
*.tsbuildinfo
EOF

cat > "$ROOT/postcss.config.js" << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF

cat > "$ROOT/next.config.mjs" << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
EOF

cat > "$ROOT/tailwind.config.ts" << 'EOF'
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
EOF

cat > "$ROOT/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
EOF

cat > "$ROOT/Dockerfile" << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
EOF

cat > "$ROOT/docker-compose.yml" << 'EOF'
version: "3.9"
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: trb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    command: npm run dev
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - postgres

  worker:
    build: .
    command: npm run worker
    env_file: .env
    depends_on:
      - postgres

volumes:
  pgdata:
EOF

cat > "$ROOT/drizzle.config.ts" << 'EOF'
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
EOF

# ---------------------------------------------------------------------------
# SQL migration
# ---------------------------------------------------------------------------

cat > "$ROOT/src/lib/db/migrations/0001_init.sql" << 'EOF'
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
EOF

# ---------------------------------------------------------------------------
# db client + drizzle schema
# ---------------------------------------------------------------------------

cat > "$ROOT/src/lib/db/client.ts" << 'EOF'
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
EOF

cat > "$ROOT/src/lib/db/schema.ts" << 'EOF'
import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  smallint,
  date,
  jsonb,
  vector,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// NOTE: 0001_init.sql is the source of truth for indexes + CHECK constraints.
// This file mirrors it for type-safe queries only.

export const userRole = pgEnum("user_role", ["teacher", "admin"]);
export const contentStatus = pgEnum("content_status", ["draft", "in_review", "published", "archived"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "success", "failed", "refunded"]);
export const enrollmentStatus = pgEnum("enrollment_status", ["active", "completed", "dropped"]);
export const moduleContentType = pgEnum("module_content_type", ["video", "text", "quiz", "resource", "external_link"]);
export const resourceType = pgEnum("resource_type", ["lesson_plan", "worksheet", "template", "other"]);
export const chatRole = pgEnum("chat_role", ["user", "assistant", "system"]);
export const embeddingSourceType = pgEnum("embedding_source_type", ["resource", "help"]);
export const reminderType = pgEnum("reminder_type", ["renewal_reminder", "payment_failed", "payment_success"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  billingContactEmail: varchar("billing_contact_email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRole("role").notNull().default("teacher"),
  adminPermissions: text("admin_permissions").array().notNull().default(sql`'{}'::text[]`),
  organizationId: uuid("organization_id").references(() => organizations.id),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("accounts_provider_uq").on(t.provider, t.providerAccountId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

export const terms = pgTable(
  "terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    academicYear: varchar("academic_year", { length: 20 }).notNull(),
    termNumber: smallint("term_number").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("terms_year_number_uq").on(t.academicYear, t.termNumber)]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    termId: uuid("term_id").notNull().references(() => terms.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
    amountKobo: integer("amount_kobo").notNull().default(500000),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    paystackReference: varchar("paystack_reference", { length: 255 }).unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscriptions_user_term_uq").on(t.userId, t.termId)]
);

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  provider: varchar("provider", { length: 50 }).notNull().default("paystack"),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  rawPayload: jsonb("raw_payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const reminderQueue = pgTable("reminder_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  type: reminderType("type").notNull(),
  channel: varchar("channel", { length: 20 }).notNull().default("email"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learningPaths = pgTable("learning_paths", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  status: contentStatus("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  status: contentStatus("status").notNull().default("draft"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  aiModelVersion: varchar("ai_model_version", { length: 100 }),
  generationPrompt: text("generation_prompt"),
  createdBy: uuid("created_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learningPathCourses = pgTable(
  "learning_path_courses",
  {
    pathId: uuid("path_id").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    sequenceOrder: integer("sequence_order").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.pathId, t.courseId] })]
);

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  resourceType: resourceType("resource_type").notNull(),
  subject: varchar("subject", { length: 100 }),
  gradeLevel: varchar("grade_level", { length: 50 }),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  fileStorageKey: varchar("file_storage_key", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 20 }),
  status: contentStatus("status").notNull().default("draft"),
  aiGenerated: boolean("ai_generated").notNull().default(true),
  aiModelVersion: varchar("ai_model_version", { length: 100 }),
  generationPrompt: text("generation_prompt"),
  contentHash: varchar("content_hash", { length: 64 }),
  createdBy: uuid("created_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    sequenceOrder: integer("sequence_order").notNull(),
    contentType: moduleContentType("content_type").notNull(),
    body: text("body"),
    videoUrl: varchar("video_url", { length: 500 }),
    resourceId: uuid("resource_id").references(() => resources.id),
    status: contentStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("modules_course_sequence_uq").on(t.courseId, t.sequenceOrder)]
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    courseId: uuid("course_id").notNull().references(() => courses.id),
    status: enrollmentStatus("status").notNull().default("active"),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("enrollments_user_course_uq").on(t.userId, t.courseId)]
);

export const moduleProgress = pgTable(
  "module_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id").notNull().references(() => enrollments.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("module_progress_enrollment_module_uq").on(t.enrollmentId, t.moduleId)]
);

export const pathEnrollments = pgTable(
  "path_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    pathId: uuid("path_id").notNull().references(() => learningPaths.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("path_enrollments_user_path_uq").on(t.userId, t.pathId)]
);

export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  courseId: uuid("course_id").references(() => courses.id),
  learningPathId: uuid("learning_path_id").references(() => learningPaths.id),
  titleSnapshot: varchar("title_snapshot", { length: 255 }).notNull(),
  recipientNameSnapshot: varchar("recipient_name_snapshot", { length: 255 }).notNull(),
  completionDate: date("completion_date").notNull(),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: chatRole("role").notNull(),
  content: text("content").notNull(),
  sourceTypeUsed: embeddingSourceType("source_type_used"),
  retrievedChunkIds: uuid("retrieved_chunk_ids").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentEmbeddings = pgTable("content_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: embeddingSourceType("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }),
  tokenCount: integer("token_count"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kbArticles = pgTable("kb_articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 100 }),
  status: contentStatus("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kbRouteExemplars = pgTable("kb_route_exemplars", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: embeddingSourceType("source_type").notNull(),
  exampleQuestion: text("example_question").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
EOF

# ---------------------------------------------------------------------------
# services
# ---------------------------------------------------------------------------

cat > "$ROOT/src/lib/services/subscriptions.service.ts" << 'EOF'
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";

export type Subscription = typeof subscriptions.$inferSelect;

/** Live DB check — the only thing requireActiveSubscription trusts. */
export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.paymentStatus, "success"),
        gt(subscriptions.expiresAt, new Date())
      )
    )
    .orderBy(desc(subscriptions.expiresAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Latest sub regardless of status — for the billing page display. */
export async function getLatestSubscription(userId: string): Promise<Subscription | null> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
EOF

# ---------------------------------------------------------------------------
# auth
# ---------------------------------------------------------------------------

cat > "$ROOT/src/types/next-auth.d.ts" << 'EOF'
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "teacher" | "admin" } & DefaultSession["user"];
  }
  interface User {
    role?: "teacher" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "teacher" | "admin";
  }
}
EOF

cat > "$ROOT/src/lib/auth/config.ts" << 'EOF'
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = creds?.email as string | undefined;
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.role = token.role as "teacher" | "admin";
      return session;
    },
  },
  pages: { signIn: "/sign-in" },
});
EOF

cat > "$ROOT/src/app/api/auth/[...nextauth]/route.ts" << 'EOF'
import { handlers } from "@/lib/auth/config";
export const { GET, POST } = handlers;
EOF

cat > "$ROOT/src/app/api/auth/register/route.ts" << 'EOF'
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const bodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input (password min 8 chars)." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  await db.insert(users).values({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 10),
    role: "teacher",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
EOF

cat > "$ROOT/src/lib/auth/guards.ts" << 'EOF'
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getActiveSubscription } from "@/lib/services/subscriptions.service";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  return session;
}

export async function requireRole(role: "teacher" | "admin") {
  const session = await requireSession();
  if (session.user.role !== role) {
    redirect(role === "teacher" ? "/admin/dashboard" : "/dashboard");
  }
  return session;
}

/** Live DB check. Used only in dashboard/learn/layout.tsx and mutation routes.
 *  Certificates + billing pages must NEVER call this — auth only, by design. */
export async function requireActiveSubscription() {
  const session = await requireSession();
  const subscription = await getActiveSubscription(session.user.id);
  if (!subscription) redirect("/dashboard/billing?reason=inactive");
  return { session, subscription };
}
EOF

cat > "$ROOT/src/middleware.ts" << 'EOF'
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

// Edge-safe instance: no DB/bcrypt imports here. Only decodes the already
// signed session cookie — role gating logic lives here, subscription checks
// live in dashboard/learn/layout.tsx (needs real DB access).
const { auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role as "teacher" | "admin";
      return session;
    },
  },
});

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (!isProtected) return;

  if (!req.auth) {
    return NextResponse.redirect(new URL("/sign-in", req.nextUrl));
  }

  if (pathname.startsWith("/admin") && req.auth.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
EOF

# ---------------------------------------------------------------------------
# ui components
# ---------------------------------------------------------------------------

cat > "$ROOT/src/lib/utils/cn.ts" << 'EOF'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF

cat > "$ROOT/src/components/ui/button.tsx" << 'EOF'
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400",
        outline: "border border-slate-300 bg-white hover:bg-slate-50 focus-visible:ring-slate-400",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
        ghost: "hover:bg-slate-100 text-slate-700",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "…" : children}
    </button>
  )
);
Button.displayName = "Button";
EOF

cat > "$ROOT/src/components/ui/badge.tsx" << 'EOF'
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-slate-100 text-slate-700",
        draft: "bg-amber-100 text-amber-800",
        in_review: "bg-blue-100 text-blue-800",
        published: "bg-emerald-100 text-emerald-800",
        active: "bg-emerald-100 text-emerald-800",
        expired: "bg-red-100 text-red-800",
        failed: "bg-red-100 text-red-800",
        pending: "bg-amber-100 text-amber-800",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
EOF

cat > "$ROOT/src/components/ui/card.tsx" << 'EOF'
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-slate-100", className)} {...props} />;
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl", className)} {...props} />;
}
EOF

cat > "$ROOT/src/components/ui/input.tsx" << 'EOF'
import { cn } from "@/lib/utils/cn";
import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
EOF

cat > "$ROOT/src/components/ui/label.tsx" << 'EOF'
import { cn } from "@/lib/utils/cn";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-slate-700", className)} {...props} />;
}
EOF

cat > "$ROOT/src/components/layout/sidebar.tsx" << 'EOF'
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export interface NavItem {
  label: string;
  href: string;
}

export function Sidebar({ items, brandLabel }: { items: NavItem[]; brandLabel: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-100 px-5 font-semibold text-slate-900">
        {brandLabel}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
EOF

cat > "$ROOT/src/components/layout/dashboard-shell.tsx" << 'EOF'
import { Sidebar, type NavItem } from "./sidebar";

const teacherNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Courses", href: "/dashboard/learn/courses" },
  { label: "Learning Paths", href: "/dashboard/learn/paths" },
  { label: "Resource Bank", href: "/dashboard/learn/resources" },
  { label: "AI Chat", href: "/dashboard/learn/chat" },
  { label: "Certificates", href: "/dashboard/certificates" },
  { label: "Billing", href: "/dashboard/billing" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={teacherNav} brandLabel="Teacher Resource Bank" />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
EOF

cat > "$ROOT/src/components/layout/admin-shell.tsx" << 'EOF'
import { Sidebar, type NavItem } from "./sidebar";

const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin/dashboard" },
  { label: "Courses", href: "/admin/courses" },
  { label: "Learning Paths", href: "/admin/paths" },
  { label: "Resources (Review)", href: "/admin/resources" },
  { label: "Users", href: "/admin/users" },
  { label: "Terms", href: "/admin/terms" },
  { label: "Subscriptions", href: "/admin/subscriptions" },
  { label: "Help KB", href: "/admin/kb" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={adminNav} brandLabel="Admin · TRB" />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
EOF

cat > "$ROOT/src/components/layout/page-header.tsx" << 'EOF'
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
EOF

cat > "$ROOT/src/components/layout/marketing-shell.tsx" << 'EOF'
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Plain component, not a Next.js layout — used directly inside the two
// marketing pages (home, pricing) so no route-group folder is needed at all.
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold text-slate-900">
            Teacher Resource Bank
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-slate-600 hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/sign-in" className="text-sm text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Teacher Resource Bank
      </footer>
    </div>
  );
}
EOF

# ---------------------------------------------------------------------------
# root layout + globals
# ---------------------------------------------------------------------------

cat > "$ROOT/src/app/globals.css" << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

cat > "$ROOT/src/app/layout.tsx" << 'EOF'
import "./globals.css";

export const metadata = { title: "Teacher Resource Bank" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

# ---------------------------------------------------------------------------
# marketing pages (plain, top-level, no group folder)
# ---------------------------------------------------------------------------

cat > "$ROOT/src/app/page.tsx" << 'EOF'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/layout/marketing-shell";

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          CPD courses, resources, and AI support — in one place for teachers.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Enroll in courses, download ready-made lesson plans and worksheets, and get
          instant answers from an AI assistant built on the resource bank.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/sign-up">
            <Button size="lg">Start your subscription</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline">
              View pricing
            </Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
EOF

cat > "$ROOT/src/app/pricing/page.tsx" << 'EOF'
import Link from "next/link";
import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { MarketingShell } from "@/components/layout/marketing-shell";

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-md px-6 py-20">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Teacher plan</h2>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold text-slate-900">₦5,000</p>
            <p className="mt-1 text-sm text-slate-500">per academic term</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>✓ All CPD courses &amp; learning paths</li>
              <li>✓ Full resource bank downloads</li>
              <li>✓ AI teaching assistant</li>
              <li>✓ Certificates of completion</li>
            </ul>
            <Link href="/sign-up" className="mt-6 block">
              <Button className="w-full">Get started</Button>
            </Link>
          </CardBody>
        </Card>
      </section>
    </MarketingShell>
  );
}
EOF

# ---------------------------------------------------------------------------
# auth pages (plain, top-level)
# ---------------------------------------------------------------------------

cat > "$ROOT/src/app/sign-in/page.tsx" << 'EOF'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Card, CardBody } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="mb-6 text-xl font-semibold text-slate-900">Sign in</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" isLoading={loading}>
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            No account? <a href="/sign-up" className="text-indigo-600 hover:underline">Sign up</a>
          </p>
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p className="font-medium">Demo accounts (after seeding):</p>
            <p>admin@trb.local / ChangeMe123!</p>
            <p>teacher@trb.local / Teacher123!</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
EOF

cat > "$ROOT/src/app/sign-up/page.tsx" << 'EOF'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Card, CardBody } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="mb-6 text-xl font-semibold text-slate-900">Create your account</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password (min 8 characters)</Label>
              <Input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" isLoading={loading}>
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Already registered? <a href="/sign-in" className="text-indigo-600 hover:underline">Sign in</a>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
EOF

# ---------------------------------------------------------------------------
# teacher area — everything under /dashboard (real folder, no groups)
# ---------------------------------------------------------------------------

cat > "$ROOT/src/app/dashboard/layout.tsx" << 'EOF'
import { requireRole } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// Applies to EVERYTHING under /dashboard: overview, billing, certificates,
// and the nested /dashboard/learn/* subtree.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole("teacher");
  return <DashboardShell>{children}</DashboardShell>;
}
EOF

cat > "$ROOT/src/app/dashboard/page.tsx" << 'EOF'
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui";

const quickLinks = [
  { href: "/dashboard/learn/courses", title: "Browse courses", desc: "CPD courses and learning paths" },
  { href: "/dashboard/learn/resources", title: "Resource bank", desc: "Lesson plans, worksheets, templates" },
  { href: "/dashboard/learn/chat", title: "AI assistant", desc: "Ask questions about any resource" },
];

export default async function TeacherDashboardPage() {
  const session = await requireSession();
  return (
    <>
      <PageHeader title={`Welcome back, ${session.user.name?.split(" ")[0] ?? "teacher"}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        {quickLinks.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardBody>
                <p className="font-medium text-slate-900">{l.title}</p>
                <p className="mt-1 text-sm text-slate-500">{l.desc}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
EOF

cat > "$ROOT/src/app/dashboard/billing/page.tsx" << 'EOF'
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/guards";
import { getLatestSubscription } from "@/lib/services/subscriptions.service";
import { db } from "@/lib/db/client";
import { terms } from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card, CardBody } from "@/components/ui";

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

// Auth-only — no requireActiveSubscription() call. A lapsed subscriber must
// still be able to reach this page to renew.
export default async function BillingPage() {
  const session = await requireSession();
  const sub = await getLatestSubscription(session.user.id);

  const term = sub
    ? (await db.select().from(terms).where(eq(terms.id, sub.termId)).limit(1))[0]
    : null;

  return (
    <>
      <PageHeader title="Billing" description="Your subscription status for the current term." />
      <Card className="max-w-lg">
        <CardBody>
          {!sub ? (
            <>
              <Badge variant="expired">No subscription</Badge>
              <p className="mt-3 text-sm text-slate-600">
                You don&apos;t have an active subscription. Course, resource, and chat access
                unlocks once your ₦5,000 term payment is confirmed — the Paystack checkout
                flow is the next build milestone.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Badge variant={sub.paymentStatus}>{sub.paymentStatus}</Badge>
                <span className="text-sm text-slate-500">{term?.name}</span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-medium text-slate-900">{formatNaira(sub.amountKobo)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Access until</dt>
                  <dd className="font-medium text-slate-900">
                    {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("en-NG") : "—"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}
EOF

cat > "$ROOT/src/app/dashboard/certificates/page.tsx" << 'EOF'
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { certificates } from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui";

// Auth-only by design — earned certificates must remain accessible even
// when the subscription lapses. No subscription check here, ever.
export default async function CertificatesPage() {
  const session = await requireSession();
  const certs = await db
    .select()
    .from(certificates)
    .where(eq(certificates.userId, session.user.id))
    .orderBy(desc(certificates.issuedAt));

  return (
    <>
      <PageHeader title="Certificates" description="Your earned certificates — always available." />
      {certs.length === 0 ? (
        <Card className="max-w-lg">
          <CardBody>
            <p className="text-sm text-slate-600">
              No certificates yet. Complete a course and your certificate will appear here —
              and stay here even if your subscription lapses.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certs.map((c) => (
            <Card key={c.id}>
              <CardBody>
                <p className="font-medium text-slate-900">{c.titleSnapshot}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Completed {new Date(c.completionDate).toLocaleDateString("en-NG")}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
EOF

cat > "$ROOT/src/app/dashboard/learn/layout.tsx" << 'EOF'
import { requireActiveSubscription } from "@/lib/auth/guards";

// Wraps ONLY /dashboard/learn/* (courses, paths, resources, chat).
// Real folder, not a route group — the whole reason we're not using
// parentheses anymore is to avoid invisible-folder URL collisions.
export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  await requireActiveSubscription();
  return <>{children}</>;
}
EOF

cat > "$ROOT/src/app/dashboard/learn/courses/page.tsx" << 'EOF'
import { PageHeader } from "@/components/layout/page-header";

export default function CoursesPage() {
  return (
    <PageHeader
      title="Courses"
      description="Implementation queued — course listing + enrollment come with the content-management milestone."
    />
  );
}
EOF

cat > "$ROOT/src/app/dashboard/learn/paths/page.tsx" << 'EOF'
import { PageHeader } from "@/components/layout/page-header";

export default function PathsPage() {
  return (
    <PageHeader
      title="Learning Paths"
      description="Implementation queued — see the README build order."
    />
  );
}
EOF

cat > "$ROOT/src/app/dashboard/learn/resources/page.tsx" << 'EOF'
import { PageHeader } from "@/components/layout/page-header";

export default function ResourcesPage() {
  return (
    <PageHeader
      title="Resource Bank"
      description="Implementation queued — arrives with the AI content pipeline milestone."
    />
  );
}
EOF

cat > "$ROOT/src/app/dashboard/learn/chat/page.tsx" << 'EOF'
import { PageHeader } from "@/components/layout/page-header";

export default function ChatPage() {
  return (
    <PageHeader
      title="AI Chat"
      description="Implementation queued — arrives with the Qwen/RAG milestone."
    />
  );
}
EOF

# ---------------------------------------------------------------------------
# admin area — everything under /admin (real folder)
# ---------------------------------------------------------------------------

cat > "$ROOT/src/app/admin/layout.tsx" << 'EOF'
import { requireRole } from "@/lib/auth/guards";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return <AdminShell>{children}</AdminShell>;
}
EOF

stub_admin_page() {
  local dir="$1"
  local title="$2"
  cat > "$ROOT/src/app/admin/$dir/page.tsx" << EOF2
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <PageHeader
      title="${title}"
      description="Implementation queued — see the README build order."
    />
  );
}
EOF2
}

stub_admin_page "dashboard" "Admin Overview"
stub_admin_page "courses" "Courses"
stub_admin_page "paths" "Learning Paths"
stub_admin_page "resources" "Resources (Review Queue)"
stub_admin_page "users" "Users"
stub_admin_page "terms" "Terms"
stub_admin_page "subscriptions" "Subscriptions"
stub_admin_page "kb" "Help Knowledge Base"

# ---------------------------------------------------------------------------
# worker placeholder
# ---------------------------------------------------------------------------

cat > "$ROOT/src/workers/index.ts" << 'EOF'
import "dotenv/config";
import PgBoss from "pg-boss";

async function main() {
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
  boss.on("error", (err) => console.error("[worker] pg-boss error:", err));
  await boss.start();
  console.log("[worker] ready — no job handlers registered yet");
}

main().catch((err) => {
  console.error("[worker] failed to start:", err);
  process.exit(1);
});
EOF

# ---------------------------------------------------------------------------
# seed script
# ---------------------------------------------------------------------------

cat > "$ROOT/scripts/seed.ts" << 'EOF'
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { subscriptions, terms, users } from "../src/lib/db/schema";

async function upsertUser(
  email: string,
  name: string,
  password: string,
  role: "teacher" | "admin"
) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(users)
    .values({ email, name, role, passwordHash: await bcrypt.hash(password, 10) })
    .returning();
  return created;
}

async function main() {
  const admin = await upsertUser(
    process.env.ADMIN_EMAIL ?? "admin@trb.local",
    "Platform Admin",
    process.env.ADMIN_PASSWORD ?? "ChangeMe123!",
    "admin"
  );

  const teacher = await upsertUser(
    "teacher@trb.local",
    "Demo Teacher",
    "Teacher123!",
    "teacher"
  );

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let term = (
    await db
      .insert(terms)
      .values({
        academicYear: "2024/2025",
        termNumber: 1,
        name: "2024/2025 — Term 1 (demo)",
        startDate: new Date(now - 30 * day).toISOString().slice(0, 10),
        endDate: new Date(now + 45 * day).toISOString().slice(0, 10),
      })
      .onConflictDoNothing()
      .returning()
  )[0];
  if (!term) {
    term = (await db.select().from(terms).where(eq(terms.academicYear, "2024/2025")).limit(1))[0];
  }

  await db
    .insert(subscriptions)
    .values({
      userId: teacher.id,
      termId: term.id,
      amountKobo: 500000,
      paymentStatus: "success",
      expiresAt: new Date(now + 45 * day),
    })
    .onConflictDoNothing();

  console.log("Seed complete:");
  console.log("  admin:  ", admin.email);
  console.log("  teacher:", teacher.email, "(active demo subscription)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
EOF

# ---------------------------------------------------------------------------
# README
# ---------------------------------------------------------------------------

cat > "$ROOT/README.md" << 'EOF'
# Teacher Resource Bank

## Routing note

This project intentionally avoids Next.js route groups (folders in
parentheses). Every folder under `src/app` is a real URL segment:

- `/` , `/pricing` — marketing (public)
- `/sign-in`, `/sign-up` — auth
- `/dashboard`, `/dashboard/billing`, `/dashboard/certificates` — teacher,
  role-gated only (accessible even with a lapsed subscription)
- `/dashboard/learn/courses|paths|resources|chat` — teacher, role- AND
  subscription-gated
- `/admin/*` — admin, role-gated

## Setup

```bash
cp .env.example .env          # then set AUTH_SECRET (see below)
docker compose up -d postgres
npm install
psql "$DATABASE_URL" -f src/lib/db/migrations/0001_init.sql
npm run seed
npm run dev                   # terminal 1
npm run worker                # terminal 2 (optional for now)