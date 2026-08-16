import { Pool } from 'pg';
import { getPool } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

export type Submission = {
  id: string;
  submitter_id: string;
  assessment_id?: string | null;
  practical_id?: string | null;
  metadata?: any;
  attachments?: any[];
  assessment_submission_id?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export async function create(s: Partial<Submission>): Promise<Submission> {
  const pool = getPool();
  const id = s.id || uuidv4();
  const now = new Date().toISOString();
  const r = await pool.query(
    `INSERT INTO submissions (id, submitter_id, assessment_id, practical_id, metadata, attachments, assessment_submission_id, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
    [id, s.submitter_id, s.assessment_id || null, s.practical_id || null, s.metadata || null, s.attachments || null, s.assessment_submission_id || null, s.status || 'pending', now]
  );
  return r.rows[0];
}

export async function findById(id: string): Promise<Submission | null> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM submissions WHERE id=$1', [id]);
  return r.rows[0] || null;  
}

export async function listRecent(limit = 50): Promise<Submission[]> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM submissions ORDER BY created_at DESC LIMIT $1', [limit]);
  return r.rows;
}

export async function findBySubmitter(submitter_id: string): Promise<Submission[]> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM submissions WHERE submitter_id=$1 ORDER BY created_at DESC LIMIT 100', [submitter_id]);
  return r.rows;
}

export async function findLatestBySubmitterAssessment(submitter_id: string, assessment_id: string) {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM submissions WHERE submitter_id=$1 AND assessment_id=$2 ORDER BY created_at DESC LIMIT 1', [submitter_id, assessment_id]);
  return r.rows[0] || null;
}

export async function findLatestBySubmitterPractical(submitter_id: string, practical_id: string): Promise<Submission | null> {
  const pool = getPool();
  const r = await pool.query(
    'SELECT * FROM submissions WHERE submitter_id=$1 AND practical_id=$2 ORDER BY created_at DESC LIMIT 1',
    [submitter_id, practical_id]
  );
  return r.rows[0] || null;
}
