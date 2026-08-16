import { Pool } from 'pg';
import { initDb, getPool } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

export type Assessment = {
  id: string;
  title: string;
  course_id: string;
  description?: string;
  metadata?: any;
  test_cases?: any;
  resources?: any[];
  created_at?: string;
  updated_at?: string;
};

export async function create(a: Partial<Assessment>): Promise<Assessment> {
  const pool = getPool();
  const id = a.id || uuidv4();
  const now = new Date().toISOString();
  const result = await pool.query(
    `INSERT INTO assessments (id, title, course_id, description, metadata, test_cases, resources, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
    [id, a.title, a.course_id, a.description || null, a.metadata || null, a.test_cases || null, a.resources || null, now]
  );
  return result.rows[0];
}

export async function findById(id: string): Promise<Assessment | null> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM assessments WHERE id=$1', [id]);
  return r.rows[0] || null;
}

export async function findByCourse(course_id: string): Promise<Assessment[]> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM assessments WHERE course_id=$1 ORDER BY created_at DESC', [course_id]);
  return r.rows;
}

export async function listAll(): Promise<Assessment[]> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM assessments ORDER BY created_at DESC LIMIT 100');
  return r.rows;
}
