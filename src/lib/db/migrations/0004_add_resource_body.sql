-- resources had no content column at all — only a file pointer — so an
-- AI-drafted resource had nowhere to put its text, and Phase D's chunking step
-- would have had nothing to chunk.
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS body TEXT;

CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON learning_paths (status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON kb_articles (status);
