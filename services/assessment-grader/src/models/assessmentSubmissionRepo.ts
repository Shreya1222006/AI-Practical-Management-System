import { getPool } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

export async function createAssessmentSubmission(payload: any) {
  const pool = getPool();
  const id = payload.id || uuidv4();
  const now = new Date().toISOString();
  const r = await pool.query(
    `INSERT INTO assessment_submissions (id, submission_id, assessment_id, grader_results, score, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
    [id, payload.submission_id, payload.assessment_id, payload.grader_results || null, payload.score || 0, now]
  );
  return r.rows[0];
}
