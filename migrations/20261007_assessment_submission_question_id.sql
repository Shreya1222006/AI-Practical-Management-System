-- Store the question ID directly with each graded assessment result.
BEGIN;

ALTER TABLE public.assessment_submissions
  ADD COLUMN IF NOT EXISTS question_id UUID;

UPDATE public.assessment_submissions AS result
SET question_id = submission.question_id
FROM public.submissions AS submission
WHERE result.submission_id = submission.id
  AND result.question_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_submissions_question_id_fkey'
      AND conrelid = 'public.assessment_submissions'::regclass
  ) THEN
    ALTER TABLE public.assessment_submissions
      ADD CONSTRAINT assessment_submissions_question_id_fkey
      FOREIGN KEY (question_id)
      REFERENCES public.questions(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_user_assessment_question
  ON public.assessment_submissions (student_id, assessment_id, question_id);

COMMIT;
