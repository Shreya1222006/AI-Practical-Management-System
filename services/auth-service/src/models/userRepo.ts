import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../utils/db';//we access the pool that we created there

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name?: string | null;
  role: string;
  created_at: Date;
}

export async function createUser(data: { email: string; password_hash: string; name?: string }) {
  const pool = getPool();
  const id = uuidv4();
  const role = 'student';
  const res = await pool.query(
    `INSERT INTO users(id,email,password_hash,name,role,created_at) VALUES($1,$2,$3,$4,$5,NOW()) RETURNING id,email,name,role`,
    [id, data.email, data.password_hash, data.name || null, role]
  );
  return res.rows[0] as any;
}

export async function findUserByEmail(email: string) {
  const pool = getPool();
  const res = await pool.query(`SELECT * FROM users WHERE email=$1 LIMIT 1`, [email]);
  return res.rows[0] as UserRow | undefined;
}

export async function findUserById(id: string) {
  const pool = getPool();
  const res = await pool.query(`SELECT id,email,name,role FROM users WHERE id=$1 LIMIT 1`, [id]);
  return res.rows[0] as any;
}
