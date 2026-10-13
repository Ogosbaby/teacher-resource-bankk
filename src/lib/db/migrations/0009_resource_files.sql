-- Whether a resource actually has a file behind `file_storage_key`.
--
-- `file_storage_key` is NOT NULL and, until now, always virtual: a drafted text
-- resource was given a made-up path derived from its slug, so the column could not
-- be used to answer "is there a file here?". The download route and any upload UI
-- both have to know that, and guessing from the key's shape would be a rule that
-- silently breaks the first time the key format changes.
--
-- A NULL `file_uploaded_at` means the key is a placeholder. The other two columns
-- describe the object that was actually stored, and are what the download route
-- uses for its filename.
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS file_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS file_original_name VARCHAR(255);
