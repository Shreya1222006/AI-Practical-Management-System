-- Move assessment-owned questions into a reusable question bank.
-- Existing question IDs remain unchanged for test cases and submissions.
BEGIN;

ALTER TABLE assessment_questions RENAME TO questions;
DROP INDEX IF EXISTS idx_assessment_questions_assessment;

CREATE TABLE assessment_questions (
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (assessment_id, question_id),
  UNIQUE (assessment_id, position)
);

INSERT INTO assessment_questions (assessment_id, question_id, position)
SELECT q.assessment_id, q.id, q.position
FROM questions q
JOIN assessments a ON a.id = q.assessment_id;

ALTER TABLE questions
  DROP COLUMN assessment_id,
  DROP COLUMN position;

CREATE INDEX idx_assessment_questions_question
  ON assessment_questions (question_id);

COMMIT;