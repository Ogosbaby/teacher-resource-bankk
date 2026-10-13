-- Lesson Planner: teachers can generate a lesson plan with AI or upload a
-- rough draft for AI to refine, then keep the finalized version for
-- themselves. Independent of the reviewed resource bank (no status/review
-- workflow) since this content is personal to the teacher, not published.
CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100),
  grade_level VARCHAR(50),
  topic VARCHAR(255),
  body TEXT NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'ai_generated'
    CHECK (source IN ('ai_generated', 'ai_refined', 'manual')),
  source_file_name VARCHAR(255),
  ai_model_version VARCHAR(100),
  -- Lets a future offline-sync pass (SQLite <-> this table) reconcile records
  -- created while offline against the schema shape they were created under.
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_plans_owner_idx ON lesson_plans (owner_id, created_at DESC);
