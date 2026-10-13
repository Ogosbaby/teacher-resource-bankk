-- Catalog taxonomy for courses. `resources` already carries subject/grade_level/
-- tags; `courses` carried none, so the Learn tab had nothing to filter on.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS subject VARCHAR(100),
  ADD COLUMN IF NOT EXISTS class_levels TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_courses_status ON courses (status);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses (subject);
CREATE INDEX IF NOT EXISTS idx_courses_tags ON courses USING GIN (tags);
