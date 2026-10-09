import { getPool } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

export type Submission = {
  id: string;
  submitter_id: string;
  assessment_id?: string | null;
  question_id?: string | null;
  practical_id?: string | null;
  metadata?: any;
  attachments?: any[];
  status?: string;
  grader_results?: any[];
  score?: number | null;
  graded?: boolean;
  grading_details?: any;
  created_at?: string;
  updated_at?: string;
};

export async function createAssessmentSubmission(s: Partial<Submission> & {
  submitter_id: string;
  assessment_id: string;
  question_id: string;
}): Promise<Submission> {
  const pool = getPool();
  const id = s.id || uuidv4();
  const now = new Date().toISOString();
  const r = await pool.query(
    `INSERT INTO assessment_submissions
      (id, submitter_id, assessment_id, question_id, metadata, attachments, status, grader_results, score, graded, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,'[]'::jsonb,NULL,FALSE,$8,$8)
     ON CONFLICT (submitter_id, assessment_id, question_id)
     DO UPDATE SET
       id = EXCLUDED.id,
       metadata = EXCLUDED.metadata,
       attachments = EXCLUDED.attachments,
       status = EXCLUDED.status,
       grader_results = '[]'::jsonb,
       score = NULL,
       graded = FALSE,
       grading_details = NULL,
       created_at = EXCLUDED.created_at,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [id, s.submitter_id, s.assessment_id, s.question_id, JSON.stringify(s.metadata || {}),
      JSON.stringify(s.attachments || []), s.status || 'pending', now]
  );
  return r.rows[0];
}

export async function createPracticalSubmission(s: Partial<Submission> & {
  submitter_id: string;
  practical_id: string;
}): Promise<Submission> {
  const pool = getPool();
  const id = s.id || uuidv4();
  const now = new Date().toISOString();
  const r = await pool.query(
    `INSERT INTO practical_submissions
      (id, submitter_id, practical_id, metadata, attachments, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$7) RETURNING *`,
    [id, s.submitter_id, s.practical_id, JSON.stringify(s.metadata || {}),
      JSON.stringify(s.attachments || []), s.status || 'pending', now]
  );
  return r.rows[0];
}

export async function findById(id: string): Promise<Submission | null> {
  const pool = getPool();
  const assessment = await pool.query('SELECT * FROM assessment_submissions WHERE id=$1', [id]);
  if (assessment.rows[0]) return assessment.rows[0];
  const practical = await pool.query('SELECT * FROM practical_submissions WHERE id=$1', [id]);
  return practical.rows[0] || null;
}

export async function listRecent(limit = 50): Promise<Submission[]> {
  const pool = getPool();
  const r = await pool.query(
    `SELECT * FROM (
       SELECT id, submitter_id, assessment_id, question_id, NULL::uuid AS practical_id,
              metadata, attachments, status, grader_results, score, graded, grading_details,
              created_at, updated_at
       FROM assessment_submissions
       UNION ALL
       SELECT id, submitter_id, NULL::uuid AS assessment_id, NULL::uuid AS question_id,
              practical_id, metadata, attachments, status, NULL::jsonb AS grader_results,
              NULL::numeric AS score, NULL::boolean AS graded, NULL::jsonb AS grading_details,
              created_at, updated_at
       FROM practical_submissions
     ) AS all_submissions
     ORDER BY created_at DESC LIMIT $1`, [limit]
  );
  return r.rows;
}

export async function findBySubmitter(submitter_id: string): Promise<Submission[]> {
  const pool = getPool();
  const r = await pool.query(
    `SELECT * FROM (
       SELECT id, submitter_id, assessment_id, question_id, NULL::uuid AS practical_id,
              metadata, attachments, status, grader_results, score, graded, grading_details,
              created_at, updated_at
       FROM assessment_submissions WHERE submitter_id=$1
       UNION ALL
       SELECT id, submitter_id, NULL::uuid AS assessment_id, NULL::uuid AS question_id,
              practical_id, metadata, attachments, status, NULL::jsonb AS grader_results,
              NULL::numeric AS score, NULL::boolean AS graded, NULL::jsonb AS grading_details,
              created_at, updated_at
       FROM practical_submissions WHERE submitter_id=$1
     ) AS all_submissions
     ORDER BY created_at DESC LIMIT 100`, [submitter_id]
  );
  return r.rows;
}

export async function findLatestBySubmitterPractical(submitter_id: string, practical_id: string): Promise<Submission | null> {
  const pool = getPool();
  const r = await pool.query(
    'SELECT * FROM practical_submissions WHERE submitter_id=$1 AND practical_id=$2 ORDER BY created_at DESC LIMIT 1',
    [submitter_id, practical_id]
  );
  return r.rows[0] || null;
}
