ALTER TABLE users
  ADD COLUMN IF NOT EXISTS class_levels text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS subjects text[] NOT NULL DEFAULT '{}'::text[];
