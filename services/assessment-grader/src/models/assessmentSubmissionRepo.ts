import { getPool } from '../utils/db';

export async function updateAssessmentSubmission(payload: any) {
  const pool = getPool();
  const now = new Date().toISOString();
  const r = await pool.query(
    `UPDATE assessment_submissions
     SET grader_results = $2::jsonb,
         score = $3,
         graded = TRUE,
         grading_details = $2::jsonb,
         status = 'graded',
         updated_at = $4
     WHERE id = $1 AND assessment_id = $5 AND question_id = $6
     RETURNING *`,
    [payload.submission_id, JSON.stringify(payload.grader_results || []), payload.score ?? 0,
      now, payload.assessment_id, payload.question_id]
  );
  if (!r.rows[0]) throw new Error('Assessment submission was replaced before grading completed');
  return r.rows[0];
}
