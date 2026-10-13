import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  bigint,
  boolean,
  integer,
  smallint,
  date,
  jsonb,
  vector,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// NOTE: 0001_init.sql + 0002_add_profile_fields.sql are the source of truth for
// indexes + CHECK constraints. This file mirrors them for type-safe queries only.

export const userRole = pgEnum("user_role", ["teacher", "admin", "sales_agent"]);
export const contentStatus = pgEnum("content_status", ["draft", "in_review", "published", "archived"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "success", "failed", "refunded"]);
export const enrollmentStatus = pgEnum("enrollment_status", ["active", "completed", "dropped"]);
export const moduleContentType = pgEnum("module_content_type", ["video", "text", "quiz", "resource", "external_link"]);
export const resourceType = pgEnum("resource_type", [
  "lesson_plan",
  "lesson_note",
  "scheme_of_work",
  "question_bank",
  "worksheet",
  "template",
  "other",
]);
export const chatRole = pgEnum("chat_role", ["user", "assistant", "system"]);
export const embeddingSourceType = pgEnum("embedding_source_type", ["resource", "help"]);
export const reminderType = pgEnum("reminder_type", ["renewal_reminder", "payment_failed", "payment_success"]);
// Added in 0012_operations.sql.
export const orderStatus = pgEnum("order_status", ["pending", "paid", "failed", "refunded", "cancelled"]);
export const activationCodeStatus = pgEnum("activation_code_status", [
  "created",
  "issued",
  "redeemed",
  "active",
  "expired",
  "revoked",
  "suspended",
  "replaced",
]);
export const deliveryChannel = pgEnum("delivery_channel", ["email", "agent", "manual"]);
export const deliveryStatus = pgEnum("delivery_status", ["queued", "sent", "failed", "skipped"]);
export const devicePlatform = pgEnum("device_platform", [
  "android",
  "windows",
  "web",
  "ios",
  "unsupported",
]);
export const deviceStatus = pgEnum("device_status", ["active", "revoked", "replaced"]);
export const releasePlatform = pgEnum("release_platform", ["android", "windows"]);
export const releaseStatus = pgEnum("release_status", ["draft", "published", "withdrawn"]);
export const agentStatus = pgEnum("agent_status", ["active", "suspended"]);

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
  classLevels: text("class_levels").array().notNull().default(sql`'{}'::text[]`),
  subjects: text("subjects").array().notNull().default(sql`'{}'::text[]`),
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
    // BIGINT in 0001_init.sql (epoch seconds, NextAuth convention) — not a timestamp.
    expiresAt: bigint("expires_at", { mode: "number" }),
  },
  (t) => {
    return {
      indexes: [uniqueIndex("accounts_provider_uq").on(t.provider, t.providerAccountId)],
    };
  }
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => {
    return {
      primaryKeys: [primaryKey({ columns: [t.identifier, t.token] })],
    };
  }
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
  (t) => {
    return {
      indexes: [uniqueIndex("terms_year_number_uq").on(t.academicYear, t.termNumber)],
    };
  }
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
  (t) => {
    return {
      indexes: [uniqueIndex("subscriptions_user_term_uq").on(t.userId, t.termId)],
    };
  }
);

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  provider: varchar("provider", { length: 50 }).notNull().default("paystack"),
  // Added in 0011_add_sales_agent_role.sql. Paystack re-delivers webhooks, so
  // the provider's own event id is the idempotency key.
  providerEventId: varchar("provider_event_id", { length: 255 }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  rawPayload: jsonb("raw_payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

// Added in 0007_add_activation_revocations.sql. Revoking a single activation
// code used to mean shipping a whole new signed batch; this table is the record
// the sync route reports and the revoke script rebuilds that batch from.
export const activationRevocations = pgTable("activation_revocations", {
  code: varchar("code", { length: 32 }).primaryKey(),
  reason: text("reason").notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }).notNull().defaultNow(),
  revokedBy: uuid("revoked_by").references(() => users.id),
});

export const reminderQueue = pgTable(
  "reminder_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    type: reminderType("type").notNull(),
    channel: varchar("channel", { length: 20 }).notNull().default("email"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => {
    return {
      // Added in 0008_reminder_uniqueness.sql — a scheduled, retried scan needs
      // the database to decide what is a duplicate.
      indexes: [uniqueIndex("reminder_queue_subscription_type_uq").on(t.subscriptionId, t.type)],
    };
  }
);

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
  // Added in 0003_add_course_taxonomy.sql — drives catalog pills + search.
  subject: varchar("subject", { length: 100 }),
  classLevels: text("class_levels").array().notNull().default(sql`'{}'::text[]`),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  status: contentStatus("status").notNull().default("draft"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  aiModelVersion: varchar("ai_model_version", { length: 100 }),
  generationPrompt: text("generation_prompt"),
  // Added in 0012_operations.sql — the app compares content versions to decide
  // what to pull, and only courses in a published package are synced.
  contentVersion: integer("content_version").notNull().default(1),
  packageId: uuid("package_id"),
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
  (t) => {
    return {
      primaryKeys: [primaryKey({ columns: [t.pathId, t.courseId] })],
    };
  }
);

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  resourceType: resourceType("resource_type").notNull(),
  subject: varchar("subject", { length: 100 }),
  gradeLevel: varchar("grade_level", { length: 50 }),
  // Added in 0010_resource_topic.sql. The curriculum path a resource belongs to,
  // `class/subject/topic` — the slug alone is not unique across subjects.
  topicPath: varchar("topic_path", { length: 200 }),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  fileStorageKey: varchar("file_storage_key", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 20 }),
  // Added in 0009_resource_files.sql. NULL means `fileStorageKey` is a placeholder
  // rather than an object that exists in storage.
  fileUploadedAt: timestamp("file_uploaded_at", { withTimezone: true }),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  fileOriginalName: varchar("file_original_name", { length: 255 }),
  // Added in 0004_add_resource_body.sql — the drafted text a reviewer reads,
  // and the input for Phase D's chunking step.
  body: text("body"),
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

// Added for the teacher-facing Lesson Planner: AI-drafted or AI-refined
// lesson plans a teacher keeps for their own use (not part of the reviewed
// resource bank, so no publish/review workflow here).
export const lessonPlans = pgTable("lesson_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 100 }),
  gradeLevel: varchar("grade_level", { length: 50 }),
  topic: varchar("topic", { length: 255 }),
  body: text("body").notNull(),
  source: varchar("source", { length: 20 }).notNull().default("ai_generated"), // ai_generated | ai_refined | manual
  sourceFileName: varchar("source_file_name", { length: 255 }),
  aiModelVersion: varchar("ai_model_version", { length: 100 }),
  // Schema/version tag carried on every locally-created record so a future
  // offline (SQLite) sync pass can reconcile records created while offline
  // against this server's schema without guessing.
  schemaVersion: integer("schema_version").notNull().default(1),
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
  (t) => {
    return {
      indexes: [uniqueIndex("modules_course_sequence_uq").on(t.courseId, t.sequenceOrder)],
    };
  }
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
  (t) => {
    return {
      indexes: [uniqueIndex("enrollments_user_course_uq").on(t.userId, t.courseId)],
    };
  }
);

export const moduleProgress = pgTable(
  "module_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id").notNull().references(() => enrollments.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => {
    return {
      indexes: [uniqueIndex("module_progress_enrollment_module_uq").on(t.enrollmentId, t.moduleId)],
    };
  }
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
  (t) => {
    return {
      indexes: [uniqueIndex("path_enrollments_user_path_uq").on(t.userId, t.pathId)],
    };
  }
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

// ---------------------------------------------------------------------------
// Internal operations (0012_operations.sql)
//
// The website is an internal LMS + operations platform; these tables are what it
// operates on. The customer-facing side of the product is the installed app,
// and what it redeems is an activation code from here.
// ---------------------------------------------------------------------------

export const salesAgents = pgTable(
  "sales_agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    region: varchar("region", { length: 120 }),
    status: agentStatus("status").notNull().default("active"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => {
    return {
      indexes: [uniqueIndex("sales_agents_email_uq").on(sql`lower(${t.email})`)],
    };
  }
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    state: varchar("state", { length: 80 }),
    schoolName: varchar("school_name", { length: 255 }),
    note: text("note"),
    createdByAgentId: uuid("created_by_agent_id").references(() => salesAgents.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => {
    return {
      indexes: [uniqueIndex("customers_email_uq").on(sql`lower(${t.email})`)],
    };
  }
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: varchar("reference", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 40 }).notNull().default("paystack"),
    providerReference: varchar("provider_reference", { length: 255 }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    salesAgentId: uuid("sales_agent_id").references(() => salesAgents.id, {
      onDelete: "set null",
    }),
    termId: uuid("term_id").references(() => terms.id, { onDelete: "set null" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    amountKobo: integer("amount_kobo").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("NGN"),
    status: orderStatus("status").notNull().default("pending"),
    source: varchar("source", { length: 20 }).notNull().default("website"),
    authorizationUrl: varchar("authorization_url", { length: 500 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => {
    return {
      indexes: [uniqueIndex("orders_reference_uq").on(t.reference)],
    };
  }
);

export const activationCodes = pgTable(
  "activation_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull(),
    codeVersion: integer("code_version").notNull().default(1),
    status: activationCodeStatus("status").notNull().default("created"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    salesAgentId: uuid("sales_agent_id").references(() => salesAgents.id, {
      onDelete: "set null",
    }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    termId: uuid("term_id").references(() => terms.id, { onDelete: "set null" }),
    durationMonths: smallint("duration_months").notNull().default(3),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    boundUserId: uuid("bound_user_id").references(() => users.id, { onDelete: "set null" }),
    boundDeviceId: varchar("bound_device_id", { length: 64 }),
    deliveryChannel: deliveryChannel("delivery_channel").notNull().default("email"),
    deliveryStatus: deliveryStatus("delivery_status").notNull().default("queued"),
    deliveryAttempts: integer("delivery_attempts").notNull().default(0),
    lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
    deliveryError: text("delivery_error"),
    deliveredTo: varchar("delivered_to", { length: 255 }),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    replacedById: uuid("replaced_by_id"),
    schemaVersion: integer("schema_version").notNull().default(1),
  },
  (t) => {
    return {
      indexes: [uniqueIndex("activation_codes_code_uq").on(t.code)],
    };
  }
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    activationCodeId: uuid("activation_code_id").references(() => activationCodes.id, {
      onDelete: "set null",
    }),
    platform: devicePlatform("platform").notNull().default("unsupported"),
    deviceModel: varchar("device_model", { length: 160 }),
    osVersion: varchar("os_version", { length: 60 }),
    appVersion: varchar("app_version", { length: 40 }),
    status: deviceStatus("status").notNull().default("active"),
    boundAt: timestamp("bound_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => {
    return {
      indexes: [uniqueIndex("devices_device_id_uq").on(t.deviceId)],
    };
  }
);

export const contentPackages = pgTable(
  "content_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: varchar("version", { length: 40 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    checksum: varchar("checksum", { length: 64 }),
    courseCount: integer("course_count").notNull().default(0),
    moduleCount: integer("module_count").notNull().default(0),
    releaseNotes: text("release_notes"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => {
    return {
      indexes: [uniqueIndex("content_packages_version_uq").on(t.version)],
    };
  }
);

export const appReleases = pgTable(
  "app_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: releasePlatform("platform").notNull(),
    architecture: varchar("architecture", { length: 40 }).notNull().default("universal"),
    version: varchar("version", { length: 40 }).notNull(),
    buildNumber: integer("build_number").notNull().default(1),
    downloadUrl: varchar("download_url", { length: 500 }).notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    releaseDate: date("release_date").notNull(),
    minSupportedVersion: varchar("min_supported_version", { length: 40 }),
    status: releaseStatus("status").notNull().default("draft"),
    releaseNotes: text("release_notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => {
    return {
      indexes: [uniqueIndex("app_releases_platform_version_arch_uq").on(t.platform, t.version, t.architecture)],
    };
  }
);
