-- Where a resource sits in the curriculum.
--
-- Resources carried a free-text subject and grade level, which is enough to list
-- them but not enough to place them: the teacher-facing URL is
-- /subjects/<level>/<class>/<subject>/<topic>/<resource>, and nothing in the row
-- said which topic it belonged to. Listing by subject would have shown every
-- Mathematics resource under every Mathematics topic.
--
-- The full path is stored rather than just the topic slug, because topic slugs are
-- only unique within a subject — "introduction" exists in several of them — and a
-- bare slug would quietly mix those resources together.
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS topic_path VARCHAR(200);

-- The topic page is the only read that filters on this, and it always filters on
-- published status at the same time.
CREATE INDEX IF NOT EXISTS resources_topic_path_idx
  ON resources (status, topic_path);
