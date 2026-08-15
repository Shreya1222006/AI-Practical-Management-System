-- Migration: Separate assessment-specific data into `assessment_submissions`
-- Date: 2026-08-15
-- NOTE: Review and run in a controlled environment. Back up DB before running.

BEGIN;

-- 1. Create new table
CREATE TABLE IF NOT EXISTS assessment_submissions (
  submission_id  UUID PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
  auto_score     DECIMAL(7,2),
  test_results   JSONB NOT NULL DEFAULT '[]'::jsonb,
  status         VARCHAR(32) NOT NULL,
  run_metadata   JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assess_subm_submission ON assessment_submissions(submission_id);
CREATE INDEX IF NOT EXISTS idx_assess_subm_status ON assessment_submissions((status));
CREATE INDEX IF NOT EXISTS idx_assess_subm_test_results ON assessment_submissions USING GIN (test_results);

-- 2. Backfill from submissions (assessment rows only)
INSERT INTO assessment_submissions (submission_id, auto_score, test_results, status, run_metadata, created_at)
SELECT id, auto_score, COALESCE(test_results, '[]'::jsonb),
       COALESCE(assessment_status::text, 'partial')::varchar, '{}'::jsonb, submitted_at
FROM submissions
WHERE assessment_id IS NOT NULL
  AND (test_results IS NOT NULL OR auto_score IS NOT NULL OR assessment_status IS NOT NULL);

-- 3. Optional: verify backfill, then drop deprecated columns manually.
-- Uncomment and run only after verification and backups.
-- ALTER TABLE submissions DROP COLUMN assessment_status;
-- ALTER TABLE submissions DROP COLUMN test_results;
-- ALTER TABLE submissions DROP COLUMN auto_score;
-- ALTER TABLE submissions DROP COLUMN max_score;

-- 4. Ensure unique attempts index exists (created in doc). If not, create it now:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'uq_submission_attempt'
  ) THEN
    CREATE UNIQUE INDEX uq_submission_attempt ON submissions(
      student_id, activity_type, COALESCE(practical_id::text, assessment_id::text), attempt_number
    );
  END IF;
END$$;

COMMIT;
