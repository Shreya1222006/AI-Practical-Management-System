-- Migration: create submissions table (derived from entities.md)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitter_id uuid NOT NULL,
  assessment_id uuid,
  practical_id uuid,
  metadata jsonb,
  attachments jsonb,
  assessment_submission_id uuid,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_submitter ON submissions (submitter_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assessment ON submissions (assessment_id);
