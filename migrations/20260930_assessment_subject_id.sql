-- Align existing databases with the subject-based assessments API.
BEGIN;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS subject_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'assessments'
      AND column_name = 'course_id'
  ) THEN
    UPDATE assessments
    SET subject_id = course_id
    WHERE subject_id IS NULL;

    ALTER TABLE assessments DROP COLUMN course_id;
  END IF;
END $$;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS resources JSONB;
CREATE INDEX IF NOT EXISTS idx_assessments_subject ON assessments (subject_id);

COMMIT;