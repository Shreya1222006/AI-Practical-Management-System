-- Destructively replace the shared submissions tables with separate stores.
-- Existing submission and grader-result history is intentionally discarded.
BEGIN;

DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.assessment_submissions CASCADE;
DROP TABLE IF EXISTS public.practical_submissions CASCADE;

CREATE TABLE public.assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id UUID NOT NULL,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  grader_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC(7,2),
  graded BOOLEAN NOT NULL DEFAULT FALSE,
  grading_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_submissions_assessment_question_fkey
    FOREIGN KEY (assessment_id, question_id)
    REFERENCES public.assessment_questions(assessment_id, question_id)
    ON DELETE CASCADE,
  CONSTRAINT assessment_submissions_submitter_assessment_question_key
    UNIQUE (submitter_id, assessment_id, question_id)
);

CREATE INDEX idx_assessment_submissions_assessment
  ON public.assessment_submissions (assessment_id, question_id);

CREATE TABLE public.practical_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id UUID NOT NULL,
  practical_id UUID NOT NULL REFERENCES public.practicals(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_practical_submissions_submitter_practical
  ON public.practical_submissions (submitter_id, practical_id, created_at DESC);

COMMIT;