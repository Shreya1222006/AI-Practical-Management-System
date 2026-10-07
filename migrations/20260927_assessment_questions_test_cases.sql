-- Assessment questions and per-question test cases for Judge0-style evaluation.
-- Apply after the existing assessments and submissions migrations.
BEGIN;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS resources JSONB;

-- The original root schema requires institution_id and subject_id. Keep those
-- legacy columns but allow the subject-based API to create rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'assessments' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE assessments ALTER COLUMN institution_id DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'assessments' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE assessments ALTER COLUMN subject_id DROP NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  language VARCHAR(30) NOT NULL DEFAULT 'cpp',
  environment VARCHAR(50) NOT NULL DEFAULT 'cpp-gcc',
  time_limit_sec INTEGER NOT NULL DEFAULT 5 CHECK (time_limit_sec > 0),
  memory_limit_mb INTEGER NOT NULL DEFAULT 256 CHECK (memory_limit_mb > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, position)
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment
  ON assessment_questions (assessment_id, position);

CREATE TABLE IF NOT EXISTS question_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  input TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL,
  points NUMERIC(7,2) NOT NULL DEFAULT 1 CHECK (points > 0),
  is_hidden BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, position)
);

CREATE INDEX IF NOT EXISTS idx_question_test_cases_question
  ON question_test_cases (question_id, position);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES assessment_questions(id) ON DELETE SET NULL;

-- Align the grader's write model with both the root schema and the older
-- grader-specific assessment_submissions table, without dropping existing data.
CREATE TABLE IF NOT EXISTS assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  assessment_id UUID NOT NULL,
  student_id UUID,
  grader_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC(7,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS assessment_id UUID;
ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS grader_results JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS score NUMERIC(7,2);
ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS graded BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS grading_details JSONB;

-- An older migration defines a required status column; give it a compatible default.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'assessment_submissions' AND column_name = 'status'
  ) THEN
    ALTER TABLE assessment_submissions ALTER COLUMN status SET DEFAULT 'graded';
  END IF;
END $$;

COMMIT;
