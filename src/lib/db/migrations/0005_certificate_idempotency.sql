-- Certificate issuing runs in a retryable background job, so one certificate per
-- (user, target) has to be enforced by the database rather than trusted to the
-- handler. Partial indexes because exactly one of course_id / learning_path_id
-- is set (see the exactly_one_target CHECK in 0001_init.sql) and NULLs are not
-- considered equal by a plain UNIQUE constraint.
CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_course_uq
  ON certificates (user_id, course_id)
  WHERE course_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_path_uq
  ON certificates (user_id, learning_path_id)
  WHERE learning_path_id IS NOT NULL;
